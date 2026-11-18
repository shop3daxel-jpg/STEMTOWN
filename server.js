/* STEM TOWN · máy chủ nhiều người chơi (không cần cài thêm thư viện, chỉ cần Node.js 16 trở lên).
   Chạy:  node server.js        (mặc định cổng 3000, đặt biến PORT để đổi)
   Mở:    http://localhost:3000  — mọi người mở cùng địa chỉ này sẽ thấy nhau. */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||3000,MAX=+process.env.MAX_PLAYERS||200,HTML=path.join(__dirname,'stemtown.html');
const GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients=new Map();let dirty=false;
const server=http.createServer((req,res)=>{
 const u=req.url.split('?')[0];
 if(u==='/healthz'){res.writeHead(200,{'content-type':'text/plain'});return res.end('ok '+clients.size)}
 if(u==='/'||u==='/index.html'||u==='/stemtown.html'){
  fs.readFile(HTML,(e,b)=>{if(e){res.writeHead(500);return res.end('Thiếu file stemtown.html cạnh server.js')}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});res.end(b)});return;
 }
 res.writeHead(404);res.end('404');
});
function frame(str){
 const p=Buffer.from(str),n=p.length;let h;
 if(n<126)h=Buffer.from([0x81,n]);else if(n<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(n,2)}else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}
 return Buffer.concat([h,p]);
}
function send(c,obj){if(c.sock.destroyed)return;try{c.sock.write(frame(JSON.stringify(obj)))}catch(e){}}
const num=(v,lo,hi)=>typeof v==='number'&&isFinite(v)?Math.max(lo,Math.min(hi,v)):null;
function clean(d,old){
 const o=Object.assign({},old);if(!d||typeof d!=='object')return o;
 if('n' in d){if(d.n===null)delete o.n;else if(typeof d.n==='string'){const n=d.n.replace(/[^\p{L}\p{N} _.\-]/gu,'').trim().slice(0,16);if(n.length>=2)o.n=n}}
 for(const [k,lo,hi] of [['m',-1,15],['f',0,9],['x',-200,200],['z',-200,200],['y',-20,20],['s',0,12]]){if(k in d){const v=d[k]===null?null:num(d[k],lo,hi);if(v===null)delete o[k];else o[k]=k==='m'||k==='f'?Math.round(v):v}}
 if('q' in d){if(d.q)o.q=1;else delete o.q}
 if('c' in d){const c=d.c;if(c&&typeof c==='object'&&typeof c.t==='string'&&typeof c.k==='number')o.c={k:c.k,t:c.t.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,200)};else if(c===null)delete o.c}
 return o;
}
function nameUsed(n,self){const l=n.toLowerCase();for(const c of clients.values())if(c!==self&&c.p.n&&c.p.n.toLowerCase()===l)return true;return false}
function onMsg(c,text){
 let m;try{m=JSON.parse(text)}catch(e){return}
 const now=Date.now();if(now-c.win>1000){c.win=now;c.cnt=0}if(++c.cnt>40)return;
 if(m&&m.t==='p'){
  const next=clean(m.d,c.p);
  if(next.n&&next.n!==c.p.n&&nameUsed(next.n,c)){send(c,{t:'taken'});return}
  c.p=next;dirty=true;
 }
}
function onData(c,chunk){
 c.buf=Buffer.concat([c.buf,chunk]);
 for(;;){
  const b=c.buf;if(b.length<2)return;
  const fin=!!(b[0]&128),op=b[0]&15,masked=!!(b[1]&128);let len=b[1]&127,o=2;
  if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);o=4}else if(len===127){if(b.length<10)return;len=Number(b.readBigUInt64BE(2));o=10}
  if(len>8192){kill(c);return}
  if(!masked){kill(c);return}
  if(b.length<o+4+len)return;
  const key=b.slice(o,o+4),pl=Buffer.from(b.slice(o+4,o+4+len));for(let i=0;i<len;i++)pl[i]^=key[i&3];
  c.buf=b.slice(o+4+len);
  if(op===8){kill(c);return}
  if(op===9){try{c.sock.write(Buffer.concat([Buffer.from([0x8a,pl.length]),pl]))}catch(e){}continue}
  if(op===10){c.alive=Date.now();continue}
  if(op===1||op===0){c.frag=op===1?[pl]:(c.frag||[]).concat([pl]);if(fin){const t=Buffer.concat(c.frag).toString('utf8');c.frag=null;onMsg(c,t)}}
 }
}
function kill(c){if(!clients.has(c.id))return;clients.delete(c.id);dirty=true;try{c.sock.destroy()}catch(e){}}
server.on('upgrade',(req,sock)=>{
 if(req.url.split('?')[0]!=='/ws'||!req.headers['sec-websocket-key']||clients.size>=MAX){sock.write('HTTP/1.1 400 Bad Request\r\n\r\n');sock.destroy();return}
 const acc=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+GUID).digest('base64');
 sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
 const c={id:crypto.randomBytes(6).toString('hex'),sock,buf:Buffer.alloc(0),p:{},win:0,cnt:0,alive:Date.now(),frag:null};
 clients.set(c.id,c);sock.setNoDelay(true);
 sock.on('data',d=>onData(c,d));sock.on('close',()=>kill(c));sock.on('error',()=>kill(c));
 send(c,{t:'hi',id:c.id});dirty=true;
});
setInterval(()=>{
 if(!dirty)return;dirty=false;
 const all=[];for(const c of clients.values())if(c.p.n)all.push({peer:c.id,presence:c.p});
 for(const c of clients.values())send(c,{t:'s',peers:all.filter(a=>a.peer!==c.id)});
},100);
setInterval(()=>{const now=Date.now();for(const c of clients.values()){if(now-c.alive>70000){kill(c);continue}try{c.sock.write(Buffer.from([0x89,0]))}catch(e){}}},20000);
server.listen(PORT,()=>console.log('STEM TOWN chạy tại http://localhost:'+PORT+'  (người chơi mở cùng địa chỉ này sẽ thấy nhau)'));

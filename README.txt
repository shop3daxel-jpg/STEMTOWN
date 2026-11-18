STEM TOWN - MÁY CHỦ NHIỀU NGƯỜI CHƠI

1) Chạy thử trên máy bạn (cần Node.js 16 trở lên)
   node server.js
   Mở http://localhost:3000 . Mọi người mở CÙNG địa chỉ này sẽ thấy nhau (cùng một server).
   Đổi cổng:  PORT=8080 node server.js

2) Cho người khác trong mạng LAN
   Mở http://<IP-máy-bạn>:3000 (ví dụ http://192.168.1.20:3000).

3) Đưa lên Internet để ai cũng vào được bằng link công khai
   Dùng bất kỳ dịch vụ chạy Node.js (Render, Railway, Fly.io, VPS...):
   - Tải cả thư mục này lên (server.js, stemtown.html, package.json).
   - Lệnh chạy: node server.js (hoặc npm start). Dịch vụ sẽ tự đặt biến PORT.
   - Dịch vụ cấp địa chỉ https://... ; game tự dùng wss:// cùng địa chỉ đó.
   Kiểm tra server còn sống: <địa-chỉ>/healthz

Ghi chú
- Không cần tài khoản claude.ai. Người chơi tạo tên trong game; tên không được trùng với người đang online.
- Server chỉ giữ vị trí, tên, nhân vật và tin nhắn mới nhất trong bộ nhớ, không lưu lịch sử. Tắt server là mất.
- Tối đa 200 người cùng lúc (đổi bằng biến MAX_PLAYERS).
- Trang stemtown.html vẫn cần tải thư viện Three.js từ cdnjs, nên máy người chơi cần có Internet.

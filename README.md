# Shop Bot + Website

Bán lại sản phẩm số (ChatGPT, Claude API, Capcut, MS365, ...) lấy từ API nguồn (xem
[document.txt](document.txt)), cộng chênh lệch giá cấu hình được, bán qua **Telegram
Bot** và **Website**.

## Nghiệp vụ

1. Khách đăng ký/đăng nhập (web) hoặc `/start` bot Telegram → có ví nội bộ (VND) riêng.
2. Khách nạp tiền vào ví của **bạn** (không phải ví nguồn) qua VietQR hoặc USDT.
   Nạp VietQR được **tự động phát hiện và cộng ví** nhờ webhook SePay (xem mục
   "Tự động xác nhận nạp tiền VietQR" bên dưới); USDT vẫn do admin xác nhận thủ công.
3. Khách mua sản phẩm bằng số dư ví. Giá bán = giá gốc từ nguồn + chênh lệch
   (margin % toàn cục, hoặc override riêng theo sản phẩm: % hoặc cộng thêm USD quy đổi
   theo tỷ giá `/api/rate`).
4. Khi khách mua, hệ thống tự gọi `POST /api/buy` sang API nguồn bằng **API key của
   bạn** để lấy hàng thật, trừ vào ví nguồn (được nạp bằng USDT — bạn tự nạp thủ công
   bên nguồn khi cần). Nếu nguồn thất bại, tiền được hoàn lại vào ví khách tự động.
5. Một tài khoản khách có thể dùng chung trên cả web và Telegram bằng cách liên kết:
   gõ `/link` trong bot lấy mã 6 số, nhập vào trang **Hồ sơ** trên web.

## Cấu trúc

```
server/   Express + TypeScript + Prisma (PostgreSQL) — REST API dùng chung + bot Telegram (Telegraf)
web/      Vite + React + TypeScript + Tailwind — website khách hàng & trang quản trị
```

## Chạy thử (development)

### 1. Cơ sở dữ liệu

Cần PostgreSQL. Cách nhanh nhất là dùng Docker:

```bash
docker compose up -d
```

(hoặc trỏ `DATABASE_URL` tới một PostgreSQL có sẵn của bạn)

### 2. Cài đặt

```bash
npm install
```

### 3. Cấu hình môi trường

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

Mở `server/.env` và điền:

- `SOURCE_API_KEY`: API key **của bạn** ở shop nguồn (xem document.txt, mục Authentication).
- `TELEGRAM_BOT_TOKEN`: token bot lấy từ [@BotFather](https://t.me/BotFather).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: tài khoản admin được tạo tự động lần chạy đầu tiên.
- `JWT_SECRET`: một chuỗi ngẫu nhiên bất kỳ.

### 4. Khởi tạo database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Chạy các tiến trình (mỗi lệnh một terminal riêng)

```bash
npm run dev:server   # API tại http://localhost:4000
npm run dev:bot      # Telegram bot
npm run dev:web      # Website tại http://localhost:5173
```

Đăng nhập trang Quản trị (`/admin`) bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` để:

- Cấu hình margin mặc định + override riêng từng sản phẩm.
- Điền thông tin nhận nạp VietQR (mã BIN ngân hàng, số tài khoản, tên) và địa chỉ ví USDT.
- Duyệt các yêu cầu nạp tiền của khách (Xác nhận/Từ chối).
- Xem số dư ví bên nguồn để biết khi nào cần nạp thêm USDT sang bên đó.
- Đồng bộ danh sách sản phẩm mới nhất từ API nguồn.

## Tự động xác nhận nạp tiền VietQR (webhook SePay)

Khi khách tạo yêu cầu nạp VietQR, hệ thống tự sinh **nội dung chuyển khoản** (mã dạng
`DEPXXXXXXXXXX`) và **số tiền chính xác** rồi nhúng vào QR. [SePay](https://sepay.vn) kết
nối trực tiếp với tài khoản ngân hàng của bạn; mỗi khi có tiền vào, SePay gọi một
webhook — hệ thống nhận request đó, tìm mã `DEP...` trong nội dung chuyển khoản, đối
chiếu đúng số tiền với giao dịch đang `PENDING`, rồi tự động cộng ví khách và gửi
thông báo Telegram. Không cần admin bấm xác nhận tay nữa.

Thiết lập:

1. Đăng ký tài khoản tại [sepay.vn](https://sepay.vn) và kết nối tài khoản ngân hàng
   nhận tiền (phải trùng với `bankId`/`bankAccountNo` đã cấu hình ở trang Quản trị).
2. Server của bạn cần một URL **public** để SePay gọi tới (dùng ngrok/Cloudflare Tunnel
   khi chạy local, hoặc domain thật khi deploy production).
3. Trong dashboard SePay, vào mục Webhooks, thêm:
   - URL: `https://<domain-cua-ban>/api/webhooks/sepay`
   - Phương thức: `POST`
   - "API Key": đặt một chuỗi bí mật bất kỳ.
4. Vào `/admin` → tab **Cấu hình**, dán đúng chuỗi đó vào ô "API Key webhook (phải khớp
   với SePay)". Server sẽ đối chiếu header `Authorization: Apikey ...` mà SePay gửi lên
   với giá trị này để chống giả mạo webhook.
5. Test bằng cách tạo một yêu cầu nạp tiền VietQR trên web/bot rồi chuyển khoản thật —
   ví sẽ được cộng tự động trong khoảng 1 phút.

Nếu ngân hàng của khách cắt/đổi nội dung chuyển khoản khiến hệ thống không tự khớp
được mã, giao dịch vẫn được ghi lại ở tab **Đối soát ngân hàng** trong trang Quản trị
để admin khớp thủ công với đúng yêu cầu nạp tiền đang chờ.

## Ghi chú

- Nạp tiền (khách → bạn) và mua hàng (bạn → nguồn) là hai luồng tiền tách biệt hoàn
  toàn; margin chính là phần bạn giữ lại ở giữa.
- Nạp USDT vẫn xác nhận **thủ công** (admin bấm xác nhận sau khi kiểm tra đã nhận được
  USDT) vì hệ thống chưa tích hợp theo dõi blockchain; nạp VietQR đã tự động qua SePay
  như trên. Cả hai đều có thể xác nhận tay từ trang Quản trị nếu cần.
- Chưa có tính năng rút tiền vì sản phẩm bán ra là hàng số tiêu dùng ngay, có thể bổ
  sung sau nếu cần.

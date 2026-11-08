# Working Time

ระบบเช็กชื่อเข้างานบนมือถือ แสดงสถานะวันนี้ทันที จัดการตารางงาน ปฏิทินประวัติ และการลา

## Features

- เข้าสู่ระบบ Google เฉพาะบัญชี `@gmail.com` ด้วย session cookie แบบ HttpOnly และ Secure
- เช็กอินและเช็กเอาต์ พร้อมคำนวณสถานะมาสายตามเกณฑ์ของผู้ใช้
- สรุปวันมาทำงาน มาสาย ขาดงาน และวันลา
- ตั้งวันทำงาน เวลาเริ่ม/เลิกงาน และเกณฑ์มาสายรายวัน
- ดูปฏิทินหรือรายการย้อนหลัง พร้อมส่งออก CSV และยื่นคำขอลา
- ใช้วันที่และเวลาเขต `Asia/Bangkok` และภาษาไทย

## Development

ต้องใช้ Node.js 20 ขึ้นไป และ npm

```sh
npm install
npm run db:migrate:local
npm run dev
```

เปิด `http://localhost:5173` โดย Vite ส่ง `/api` ไปยัง Worker ที่ `http://localhost:8787` ให้สร้าง `.dev.vars` จาก `.env.example` ก่อนทดสอบ OAuth ในเครื่อง (ตั้ง `APP_URL` เป็น `http://localhost:8787` และเพิ่ม callback URL ใน Google Cloud Console ให้ตรงกัน).

## Database

สร้างฐาน D1 ใน Cloudflare แล้วใส่ `database_id` ใน `wrangler.toml`. ไฟล์ schema อยู่ใน `migrations/`. ดู [DATABASE.md](DATABASE.md) และ [DEPLOY.md](DEPLOY.md).

## Documentation

- [Product specification](SPEC.md)
- [Architecture](ARCHITECTURE.md)
- [Database](DATABASE.md)
- [API](API.md)
- [Deployment](DEPLOY.md)
- [Changelog](CHANGELOG.md)

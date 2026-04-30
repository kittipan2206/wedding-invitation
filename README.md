# 💌 Wedding Invitation — นนท์ & เมย์

เว็บการ์ดเชิญงานแต่งงานออนไลน์ สร้างด้วย Vite + Vanilla JS

🔗 **Live site:** https://wedding-invitation-eight-sigma-97.vercel.app

---

## ✨ Features

- **Envelope animation** — เปิดซองจดหมายก่อนเข้าสู่การ์ด
- **Countdown timer** — นับถอยหลังถึงวันงาน
- **RSVP form** — ตอบรับการเข้าร่วม บันทึกลง Google Sheets อัตโนมัติ
- **Google Calendar** — ปุ่มบันทึกงานเข้าปฏิทิน Google ได้เลย
- **Google Maps** — ปุ่มนำทางไปสถานที่จัดงาน
- **Background music** — เพลงประกอบพร้อมปุ่มเปิด/ปิด
- **Petal rain** — ดอกไม้ร่วงตกในหน้าแรก
- **Scroll reveal** — animation เมื่อ scroll ผ่านแต่ละ section
- **Responsive** — รองรับมือถือและ desktop

---

## 🗓 รายละเอียดงาน

| รายการ | ข้อมูล |
|--------|--------|
| วันที่ | วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569 |
| เวลา | 11:00 น. (รับประทานอาหาร 12:00 น.) |
| สถานที่ | ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล |
| การแต่งกาย | Pastel Formal — สีโทนพาสเทล |

---

## 🛠 Tech Stack

- **Vite** — build tool
- **Vanilla JS** — ไม่มี framework
- **CSS Custom Properties** — design tokens
- **Google Apps Script** — รับข้อมูล RSVP เข้า Google Sheets
- **Vercel** — hosting & deployment

---

## 🚀 Getting Started

```bash
# ติดตั้ง dependencies
npm install

# รัน dev server
npm run dev

# Build สำหรับ production
npm run build
```

---

## 📋 RSVP Setup

ฟอร์ม RSVP ส่งข้อมูลผ่าน Google Apps Script ไปเก็บใน Google Sheets

หากต้องการเปลี่ยน endpoint แก้ค่า `SHEET_URL` ใน [`src/js/rsvp.js`](src/js/rsvp.js)

---

## 📁 Project Structure

```
wedding-invitation/
├── index.html
├── src/
│   ├── main.js
│   ├── js/
│   │   ├── envelope.js      # animation เปิดซอง
│   │   ├── countdown.js     # นับถอยหลัง
│   │   ├── rsvp.js          # ฟอร์ม RSVP → Google Sheets
│   │   ├── music.js         # เพลงประกอบ
│   │   ├── petals.js        # ดอกไม้ร่วง
│   │   └── reveal.js        # scroll reveal
│   └── styles/
│       ├── base.css
│       ├── animations.css
│       └── components/
└── public/
```

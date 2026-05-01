# 💌 Wedding Invitation — นนท์ & เมย์

เว็บการ์ดเชิญงานแต่งงานออนไลน์ สร้างด้วย Vite + Vanilla JS

🔗 **Live:** <https://wedding-invitation-eight-sigma-97.vercel.app>

---

## รายละเอียดงาน

| | |
|---|---|
| วันที่ | วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569 |
| เวลา | 11:00 น. — รับประทานอาหาร 12:00 น. |
| สถานที่ | ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล |
| การแต่งกาย | Pastel Formal |
| RSVP ภายใน | 28 กุมภาพันธ์ 2569 |

---

## Features

| Feature | รายละเอียด |
|---|---|
| Envelope animation | เปิดซองก่อนเข้าการ์ด พร้อมปุ่ม music + fullscreen |
| Flip countdown | นับถอยหลัง 3D flip animation |
| Cursor sparkle | trail ประกายตามเมาส์ |
| Hero parallax | botanical SVG เลื่อนตามเมาส์ |
| Typewriter | วันที่พิมพ์ออกมาทีละตัว |
| Petal rain | ดอกไม้ร่วงหลังเปิดซอง |
| Details section | cards + Google Maps embed + travel info |
| RSVP | form → Google Sheets, localStorage guard, confetti |
| Guestbook | global feed (fetch จาก sheet), optimistic update |
| Gallery | placeholder grid (อัปเดตรูปหลังงาน) |
| Share modal | personalized link `?to=ชื่อ` + Line / Facebook / Copy |
| Background music | fade in/out, multi-button sync |
| Scroll-snap | proximity snap ระหว่าง sections |
| Personalized URL | `?to=ชื่อแขก` แสดงชื่อในหัวจดหมาย |

---

## Tech Stack

- **Vite** — build tool
- **Vanilla JS** — ไม่มี framework
- **CSS Custom Properties** — design tokens, DM Sans + Cormorant Garamond
- **Google Apps Script → Google Sheets** — RSVP + Guestbook backend
- **Vercel** — hosting, auto-deploy จาก `main`

---

## Getting Started

```bash
npm install
npm run dev    # dev server → http://localhost:5173
npm run build  # production build
```

---

## Branch Workflow

```
feature → develop → PR → main → Vercel deploy
```

- ทำงานบน `develop` เสมอ
- push ขึ้น `main` เมื่อ owner ยืนยัน

---

## URL Parameters (Deep Links)

### `?to=<ชื่อแขก>`

แสดงชื่อแขกในหัวจดหมายและ title ของหน้าเว็บ ใช้สำหรับส่งลิงก์ส่วนตัวให้แขกแต่ละคน

```
https://your-site.vercel.app/?to=คุณสมชาย
```

### `?goto=<sectionId>`

ข้ามหน้าต่างซอง (envelope) แล้ว scroll ตรงไปยัง section ที่กำหนด ใช้สำหรับ QR Code หรือลิงก์ตรงที่แชร์ในงาน

| ค่า | ปลายทาง |
|---|---|
| `hero` | ส่วนหัว (ชื่อบ่าวสาว) |
| `countdown` | นับถอยหลัง |
| `details` | รายละเอียดงาน |
| `rsvp` | ฟอร์มยืนยันเข้าร่วม |
| `guestbook` | ฝากคำอวยพร |
| `gallery` | แกลเลอรีรูปภาพ |

```
https://your-site.vercel.app/?goto=guestbook
```

### รวมทั้งสอง param

```
https://your-site.vercel.app/?to=คุณสมชาย&goto=rsvp
```

---

## Google Apps Script

endpoint เดียวทำทั้ง RSVP และ Guestbook

| Method | หน้าที่ |
|---|---|
| `POST` | รับ RSVP / Guestbook เขียนลง sheet |
| `GET` | return guestbook entries `[{name, message}]` |

แก้ `SHEET_URL` ใน `src/js/rsvp.js` และ `src/js/guestbook.js` หากเปลี่ยน endpoint

---

## Project Structure

```
wedding-invitation/
├── index.html
├── src/
│   ├── main.js
│   ├── js/
│   │   ├── envelope.js       animation เปิดซอง
│   │   ├── countdown.js      flip countdown
│   │   ├── rsvp.js           form + Google Sheets
│   │   ├── guestbook.js      global feed + submit
│   │   ├── share.js          personalized link modal
│   │   ├── music.js          background music
│   │   ├── petals.js         petal rain
│   │   ├── parallax.js       hero botanical parallax
│   │   ├── cursor-sparkle.js mouse trail
│   │   ├── confetti.js       confetti burst
│   │   ├── typewriter.js     typewriter effect
│   │   ├── reveal.js         scroll reveal
│   │   ├── fullscreen.js     fullscreen toggle
│   │   ├── scroll-nav.js     dot navigation
│   │   └── gallery.js        gallery preview
│   └── styles/
│       ├── base.css           tokens + scroll-snap
│       ├── animations.css
│       ├── typography.css
│       └── components/
│           ├── envelope.css
│           ├── hero.css
│           ├── countdown.css
│           ├── details.css
│           ├── rsvp.css
│           ├── guestbook.css
│           ├── gallery.css
│           ├── share-modal.css
│           ├── footer.css
│           └── scroll-nav.css
└── public/
    └── music.mp3
```

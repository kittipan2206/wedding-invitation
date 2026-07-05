# App Specification — Wedding Invitation (นนท์ & เมย์)

> Behavior spec for AI test generation.
> Tests should verify WHAT the app does for each user, not HOW the code works.
> All tests must be written from the user's perspective.

---

## Personas

| Persona     | Description                                                                      |
| ----------- | -------------------------------------------------------------------------------- |
| **Guest**   | Receives a link, views the invitation, RSVPs, writes a guestbook message         |
| **Admin**   | The couple or their helper — manages content, monitors RSVPs via the admin panel |
| **Display** | A screen at the venue showing a live photo slideshow (no interaction)            |

---

## Pages

| Page            | URL             | Who uses it              |
| --------------- | --------------- | ------------------------ |
| Main invitation | `/`             | Guest                    |
| Digital card    | `/card.html`    | Guest (share/screenshot) |
| Venue display   | `/display.html` | Display screen at venue  |
| Photo gallery   | `/gallery.html` | Guest                    |
| Admin panel     | `/admin.html`   | Admin                    |

---

## Persona: Guest — Main Page (`/`)

### Page Load

- The page shows a loading screen while fetching config from the server
- After loading, the couple's names and event details are displayed correctly
- If the server is unreachable, the page still loads using default values (no crash)
- The page title reads "{Groom} & {Bride} — ขอเรียนเชิญร่วมงานแต่งงาน"

### URL Parameters

- `?to=NAME` — the guest's name ("คุณ NAME") appears in the invitation header
- `?to=` (empty) — no name shown, invitation shows generic greeting
- `?goto=rsvp` — envelope animation is skipped; page scrolls directly to RSVP section
- `?goto=guestbook` — page scrolls directly to guestbook section

### Envelope Animation

- A sealed envelope with a wax seal is shown on each new browser session
  (sessionStorage — closing the browser and returning replays the experience)
- The couple's names are printed on the envelope front
- With `?to=NAME`, the envelope front is addressed "ถึง NAME"
- While idle, the envelope floats gently and tilts toward the pointer (desktop)
- Tapping plays one continuous sequence: the wax seal cracks with a small
  particle burst (and a haptic pulse on supported devices), the flap swings
  open revealing a patterned liner, a letter card rises out of the pocket,
  then the SAME card expands (hero transition) into the readable personal
  letter — no cut, one continuous object
- The envelope can also be opened with Enter or Space when focused (keyboard)
- A "ข้ามไปที่การ์ด" skip button appears after a moment; skipping goes straight
  to the invitation without the letter interstitial
- With reduced-motion preference, tapping jumps straight to the readable
  letter with no animation
- A "เปิดซองอีกครั้ง" button in the footer replays the envelope from the top
  (preserves `?to=`, drops `?goto=`)

### Personal Letter (part of the envelope sequence)

- The expanded letter shows a short personal note before the invitation
- The wedding date appears top-right like a real letterhead
- With `?to=NAME` the salutation "ถึง คุณNAME" types itself character by
  character with a blinking ink caret (no doubled "คุณ" when the name already
  includes it); otherwise "ถึงคนสำคัญของเรา"
- The letter mentions the event date and is signed with the couple's names
- The signature sweeps in left-to-right like a pen stroke (not typed), then a
  small heart stamp presses down beside it
- Tapping anywhere on the paper completes all text instantly — the reveal
  never holds the guest hostage
- With reduced-motion preference all text is simply shown at once
- The "เปิดการ์ดเชิญ" button (or tapping outside / Enter / Escape) melts the
  letter into the invitation page
- Returning visitors (same session), the skip button, and `?goto=` links
  never see the letter
- A music control button is visible on the envelope screen
- A fullscreen button is visible on the envelope screen
- Within the same browser session (sessionStorage), the envelope is already
  open on reload

### Hero Section

- Couple names are displayed prominently
- An arch-framed couple photo appears above the names when a photo is available
  (config `hero_photo_url`, else the first visible pre-wedding photo); without
  a photo the floral illustration shows instead
- The event date appears as a typewriter animation after envelope opens
- Floating petals/decorations animate in the background
- While scrolling, decorative elements drift at slightly different speeds
  (parallax depth): countdown digits, detail-card icons, gallery tiles, and
  divider ornaments each move on their own layer; disabled entirely under
  reduced-motion preference

### Countdown

- A live countdown shows days, hours, minutes, and seconds until the wedding
- The countdown updates every second
- The heading reads "อีก N วัน เราจะได้เจอกัน" (or "อีกไม่กี่ชั่วโมงแล้ว!" under one day)
- On the wedding day itself (Asia/Bangkok), the countdown is replaced by a
  "วันนี้แล้ว!" banner with the ceremony time and a navigate-to-venue button
- After the wedding day has passed, the countdown is replaced by a thank-you message

### Event Details

- Date card shows the full Thai date format
- Time card shows ceremony time and lunch time
- Venue card shows the location name
- Dress code card shows the required attire
- An embedded map shows the venue location
- A "Navigate" button opens Google Maps with the venue coordinates
- A single smart "บันทึกปฏิทิน" button adapts to the guest's device:
  - Apple devices (iPhone/iPad, incl. iPadOS reporting as Mac) open the
    wedding event via `/api/ics` — a real URL, so it also works inside
    LINE/Facebook in-app browsers where blob downloads fail silently; inside
    LINE the URL carries `openExternalBrowser=1` so it opens in Safari
  - Other devices open Google Calendar pre-filled with event details
- The non-default calendar option demotes to a small text link in an alt row
  under the buttons ("หรือใช้ Google Calendar" / "หรือโหลดไฟล์ .ics (Apple Calendar)");
  on desktop/Android the .ics link downloads the file built client-side
- The alt row also offers "เปิดใน Apple Maps" (Apple devices only) and a
  "คัดลอกที่อยู่" link that copies the venue name with a "คัดลอกแล้ว ✓" flash
- Calendar controls flash a "เปิดปฏิทินให้แล้ว ✓" confirmation (with a light
  haptic tick) after use
- `/api/ics` builds the .ics server-side from query params (validated, capped;
  falls back to config defaults), serves `text/calendar` — inline preview on
  iOS, attachment download elsewhere; event times are stored in UTC (Bangkok
  has no DST)

### RSVP Section

- The form reads as a reply letter: the paper carries the same pastel top
  wash as the personal letter and is headed "ถึง {groom} & {bride}"
- Guests can confirm attendance by filling out the RSVP form
- Required fields: name, attendance selection
- Optional fields: number of guests, contact info, message (max 300 characters)
- A character counter updates as the guest types in the message field
- On submit, the reply is "mailed": the form paper shrinks away, a small
  envelope appears, the letter slides inside, the flap folds shut, a wax
  seal stamps it closed, and the envelope flies off — then the thank-you
  screen appears (reduced-motion users skip straight to the thank-you)
- The thank-you screen addresses the guest by name; when attending it says
  "แล้วพบกันวันที่ {event date}" and offers the same smart calendar pairing
  right there (platform-matched primary button + the other option as a small
  text link); when declining it shows a warm message without calendar buttons
- After submitting, reloading the page still shows the personalized
  thank-you screen (localStorage persistence, including attendance)
- The form cannot be submitted with required fields empty
- After the RSVP deadline, the form is hidden entirely; a "closed" card shows the deadline date and a hint to contact the couple directly
- Thai characters and special characters in all fields are handled correctly
- The submit button is disabled after the first click to prevent double submission
- If the server does not respond, the user sees an error message (not a hang)

### Guestbook Section

- Each blessing renders as a mini letter: paper card with a pastel top wash
  and a small wax heart stamp in the corner (same motif as the envelope
  seal); cards tilt alternately like pinned notes
- The always-open form is gone: an empty dashed slot on the board reads
  "เขียนคำอวยพรถึงเรา" (border gently pulses)
- Tapping the slot expands it (hero transition) into a letter paper —
  centered overlay with a dim backdrop — headed "ถึง {groom} & {bride}",
  with the message field first and the name field as "จาก — ชื่อของท่าน";
  the message field is focused automatically
- The composer closes via the × button, tapping the backdrop, or Escape
- On send, the paper flies down onto the board and becomes the guest's own
  mini-letter card at the top of the feed, then the wax heart stamp presses
  onto it; the slot is replaced by a thank-you card
- With reduced-motion preference the composer opens/closes with no
  animation and the card simply appears in the feed
- Guests can write a congratulatory message with their name
- Both name and message are required
- Submitting a blessing triggers a flower-bloom burst animation
- A "ส่งหัวใจให้บ่าวสาว" button blooms petals on every tap
- The heart POST and global count activate ONLY after `?type=hearts` returns
  `{count: N}` — until then the button is strictly visual (the GAS doPost
  treats unknown POSTs as RSVPs, so an unguarded send creates junk RSVP rows
  and Telegram notifications)
- Submitting immediately shows the new message at the top of the feed (optimistic UI)
- The thank-you state appears after submission
- Existing messages from other guests are loaded and displayed
- HTML special characters in messages are escaped (no XSS)
- Thai characters render correctly in the feed
- The submit button is disabled after the first click to prevent double submission

### Photo Gallery (on main page)

- A preview of up to 6 photos is shown as a horizontal polaroid strip with the
  admin-written captions under each photo
- Clicking a photo opens a fullscreen photo viewer (PhotoSwipe)
- The viewer supports pinch / double-tap / wheel zoom, drag-to-close, momentum
  swipe, arrow buttons, a photo counter, and the admin caption
- Pressing Escape, the close button, or swiping down closes the viewer
- While the full image loads, the already-cached thumbnail is shown immediately
- If no photos exist, the section is hidden or shows a placeholder
- A "View All" button appears when there are more than 6 photos
- The footer note matches reality: placeholders → "photos coming after the wedding"; real photos before the event → "wedding-day photos will be added"; after the event → note hidden

### Music Player

- A floating music button is visible on all sections
- Clicking it plays background music
- Clicking again pauses it
- The button visually indicates playing vs paused state
- On iOS/Safari, music does not auto-play without a user gesture — the button prompts the user instead of crashing

### Travel Info Section

- Airport distance/info text is displayed
- Hotel recommendations text is displayed
- Parking information text is displayed

### Footer

- Couple names and date are displayed
- Social share buttons work (if present)

---

## Persona: Guest — Gallery Page (`/gallery.html`)

- All photos load and display in a grid (each with a blurred LQIP placeholder
  while it loads)
- Clicking a photo opens the fullscreen PhotoSwipe viewer (zoom, swipe, counter)
- Photos show captions if available
- Filtering by category works (pre-wedding, wedding day)
- Page works with zero photos (no crash, empty state shown)
- Page works on mobile (375px wide, touch swipe + pinch zoom in the viewer)

---

## Persona: Guest — Card Page (`/card.html`)

- The card displays couple names, date, and venue
- The design is suitable for screenshot/sharing
- An export/download button generates an image of the card
- The card shows a QR code linking back to the invitation (personalized with
  `?to=` when a guest name is entered)
- The QR code is generated locally in the wedding theme (rounded pastel style,
  heart logo) — no third-party QR service, so exports never break on CORS

---

## Persona: Display — Venue Screen (`/display.html`)

- Photos cycle automatically in a fullscreen slideshow
- The couple's names and event date are shown as an overlay
- No user interaction is required — it runs autonomously
- If no photos are available, it shows a default graphic
- The page does not require the user to click anything to start
- A themed QR code invites guests to scan and write a guestbook message
  (`?goto=guestbook`); it is generated locally so the venue screen works even
  if third-party QR services are unreachable

---

## Persona: Admin — Admin Panel (`/admin.html`)

### Authentication

- The page shows a login screen on first visit
- Entering the wrong password shows an error and clears the input
- Entering the correct password shows the admin panel
- The session persists on page reload (sessionStorage)
- Logging out returns to the login screen

### Event Info Tab

- All event fields are pre-filled with current values from the server
- Admin can edit: groom name, bride name, date, time, venue, dress code, RSVP deadline, map URLs
- Unsaved changes show a warning badge
- Saving sends all changed fields to the server and shows a success toast
- Switching tabs with unsaved changes prompts a confirmation dialog
- If the server is slow or unreachable, an appropriate error is shown

### Gallery Tab

- Existing photos are listed with thumbnail, caption, category, and order number
- Admin can add a new photo by entering a URL
- Admin can edit a photo's caption inline (click to edit, Enter/blur to save, Escape to cancel)
- Admin can toggle photo visibility (show/hide)
- Admin can reorder photos using up/down buttons
- Admin can delete a photo (with confirmation dialog)
- A refresh button reloads the photo list from the server
- Adding/editing/deleting shows a success toast

### RSVP Tab

- All RSVP submissions are listed in a table
- Summary stats show: total confirmed, total declined, total expected guests
- Admin can search by guest name
- Admin can filter by attendance status (coming / not coming)
- Admin can export the list as a CSV file
- The list updates when refreshed

### Guestbook Tab

- All guestbook messages are listed with name, message, and timestamp
- Admin can hide/show individual messages
- Admin can delete a message (with confirmation dialog)
- A toggle shows/hides already-hidden messages
- Actions show a success toast

### Music & Travel Tab

- Admin can select a song from local library (dropdown)
- Admin can enter a custom URL for a song
- Admin can upload an MP3 file (auto-uploads, shows progress bar)
- After upload, the new file appears in the dropdown automatically
- A preview button plays the selected/uploaded song
- Saving stores the music URL to the server
- Travel info fields (airport, hotel, parking) can be edited and saved
- Unsaved changes in music and travel each have their own warning badge

---

## Post-Event Memory Mode (`/` — automatic)

After the wedding day ends (event_date_iso + 1 day, Asia/Bangkok), the main page
flips to a keepsake album with no redeploy:

- Hero badge reads "Our Wedding Memory" instead of "Wedding Invitation"
- Countdown section shows the thank-you message; its label reads "ขอบคุณจากใจ"
- The RSVP section is hidden
- Travel info, "Navigate", and all calendar controls (buttons + alt-link row) are hidden
- The gallery section moves up to appear right after the countdown/thank-you
- Page title and shared-link OG tags read as a thank-you/memory, not an invite

---

## Config Validation (client-side guard for hand-edited sheet data)

- Display strings are trimmed of trailing punctuation (e.g. "31 พฤษภาคม 2569." → "…2569")
- If the Thai weekday in `event_date_display` does not match `event_date_iso`,
  the weekday is auto-corrected on render and a console warning is logged
- If the RSVP deadline has passed while the event is still upcoming, a console
  warning is logged (likely a stale deadline after a date change)

---

## Cross-Cutting Behaviors (all pages)

### Network Resilience

- Pages load using cached/default data if the server is slow (> 5s) or unreachable
- Error states are shown with a retry option where appropriate
- No page crashes or shows a blank screen due to a network failure

### Visual Polish (motion & loading)

- **RSVP success confetti**: submitting the RSVP fires a celebratory confetti
  burst (center pop + two side cannons + heart accents) in the wedding palette.
  Backed by `canvas-confetti`; respects `prefers-reduced-motion`
- **Gallery LQIP**: each photo shows a blurred 32px thumbnail (served by the
  image host) behind it while the full image lazy-loads or after its bitmap is
  released from RAM — no blank boxes while scrolling a photo-heavy gallery
- **Hero scroll parallax**: on the main page, the couple photo drifts up and
  zooms slightly slower than the page as you scroll away from the first screen,
  with the florals drifting the opposite way for depth. Backed by GSAP
  ScrollTrigger (scoped to the `.snap-wrap` scroller); skipped for reduced motion

### Shared-Link Previews (Open Graph / `api/og.js`)

- `og:title` and `og:description` are server-rendered from live config, so the
  date/venue/RSVP-deadline in the link preview text always reflect the latest
  admin edits (no redeploy needed)
- The `og:image` is an **evergreen** graphic (couple names + wordmark only, no
  date) — it never goes stale when shared details change
- The `og:image` URL carries a `?v=<hash>` derived from the shared details
  (names, date, venue, deadline, pre/post-event). When any of these change the
  hash changes, so Facebook/LINE/Twitter treat it as a new image and drop their
  cached preview instead of serving the old one

### Mobile / Responsive

- All pages are usable on iPhone 14 (390×844) without horizontal scrolling
- Touch targets (buttons, links) are at least 44×44px
- Lightbox/gallery supports swipe gestures on mobile
- The RSVP and guestbook forms are usable on mobile keyboard

### Accessibility (basic)

- All images have alt text or are decorative (aria-hidden)
- Forms have visible labels
- Interactive elements are focusable and keyboard-navigable

### Data Integrity

- All user-submitted text is HTML-escaped before rendering (no XSS)
- Thai characters, emoji, and special characters (& < > " ') do not break the UI
- Long names or messages do not overflow their containers

---

## Out of Scope for Testing

| Feature                     | Reason                            |
| --------------------------- | --------------------------------- |
| Telegram bot notifications  | External system, tested manually  |
| Google Apps Script logic    | Server-side, not in browser       |
| Actual payment flow         | No payment features in this app   |
| Email delivery              | Not implemented                   |
| Confetti / petal animations | Visual-only, no testable behavior |

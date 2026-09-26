# Wedding Invitation — Project Instructions

> Inherits from `LTD-OS/CLAUDE.md`, `profile/stack.md`, `profile/conventions.md`.
> This file only adds project-specific overrides.

## Project Identity

- **Couple**: นนท์ & เมย์
- **Stack**: Vite + Vanilla JS (no React) — keep it lightweight
- **Hosting**: Vercel (preview + prod)
- **Backend**: Google Apps Script (no Node server) — see `SPEC.md`
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Behavior spec**: `SPEC.md` is the source of truth — tests must match.

## Conventions (overrides global)

- **No framework**: stay vanilla. Do NOT introduce React/Vue/Svelte.
- **No bundler magic**: keep imports relative. No path aliases.
- **CSS**: hand-written, no Tailwind here.
- **HTML files**: multiple entry pages (`index.html`, `card.html`, `gallery.html`, `admin.html`, `display.html`) — see `vite.config.js`.
- **Build quirk**: the `static-og` plugin in `vite.config.js` copies `dist/index.html` → `dist/_template.html` (placeholders kept, template for `api/og.js`) and fills the static `dist/index.html` OG tags from `CONFIG_DEFAULTS`. On Vercel (`$VERCEL` set) `postbuild` deletes `dist/index.html` so `/` goes through the `/api/og` rewrite (live config embedded). Cloudflare Pages keeps the static file — it can't run `api/*` (no `/api/ics`, no live OG).

- **Link-preview images**: `public/og-envelope.png` and `og/envelope-to.png` are captured from the real 3D envelope (`window.__OG_CAPTURE` mode in `envelope3d.js`). After changing the envelope's look, run the dev server on 5199 and `npm run og:capture`, then bump the `envelope-N` tag in `api/og.js` so crawlers refetch. `api/og-image.js` writes `?to=` names onto `og/envelope-to.png` with `og/Charm-Regular.ttf` (resvg — shapes Thai correctly).

## Commands

```bash
npm run dev          # vite dev server (port 5173)
npm run build        # production build
npm run test         # vitest run
npm run test:e2e     # playwright E2E
npx vercel           # deploy preview
npx vercel --prod    # deploy production
```

## Personas (for tests + features)

- **Guest**: views invitation, RSVPs, writes guestbook
- **Admin**: couple/helper managing content via `/admin.html`
- **Display**: venue screen autoplaying slideshow `/display.html`

See `SPEC.md` for full behavior spec.

## Known Issues / Gotchas

- iOS Safari blocks autoplay music — must be user-gesture triggered
- localStorage persists envelope-opened + RSVP-submitted state across reloads
- Apps Script backend is slow (>5s sometimes) — must show cached defaults if unreachable
- Thai characters must not break UI; HTML-escape user input

## Out of Scope

- Payment flow
- Email delivery
- Telegram bot logic (lives in Apps Script repo, not here)

## When Owner asks to add a feature

1. Update `SPEC.md` first (behavior in user terms)
2. Implement
3. Add Vitest unit + Playwright E2E
4. `npm run build` + preview before commit

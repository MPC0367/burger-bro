# Block Party arcade — requirements, status and evidence (20 Nov 2026)

The arcade half of `documents/Burger_Bro_Complete_Upgrade_Brief_2026-11-19.pdf` (pages 2–22
and 50–53). The website items A01–A13 and B01–B06 are in the website evidence log beside
this file. **Local only**: nothing is pushed or deployed. The SMS adapter is the demo one
and every reward is TEST.

Code: `site/arcade/` (game and screens, loaded only when the arcade opens) and
`arcade-server/` (its own local git repository, the trusted backend).

Status words: **Done** = built and checked here; **Done, not live** = works locally and
needs an account or provider before launch; **Owner** = needs Burger Bro's decision or data.

## Evidence

- `arcade-server`: `npm test` → **38 of 38 pass** (15 engine, 23 API end to end on a
  temporary database). What each covers: `arcade-server/README.md` → Tests.
- Browser journey (`flow.mjs`, in the session scratchpad), against the real local site and
  server with real key presses, in **Chromium 1280×820**, **WebKit 390×844 (English)** and
  **WebKit 390×844 (Thai)**:
  1. no arcade or API request before a press;
  2. sign-up by code;
  3. play to Level 1, then Spin & Win, wheel reveal and coupon in the wallet with QR;
  4. a second run the same day with Spin disabled and its reason shown;
  5. Keep stacking to Level 2, game over, verified score counted for the week;
  6. leaderboard, then close with focus back on the entry, no console errors;
  7. staff sign-in, look-up, confirm, then look-up again shows "used" with no Confirm;
  8. the admin overview.
  All pass.
- Layout (`layout.mjs`, WebKit with touch), measured at 320×568, 375×667, 390×844,
  844×390, 568×320, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900, 1920×1080 and
  2560×1080, plus tablets with touch at 1024×768, 1180×820 and 768×1024:
  - the full 10×20 board is in view, with square cells;
  - every control is in view and ≥44 px;
  - no sideways scroll and no scrolling inside the game view.
  It also checks Thai from `?lang=th`, offline play (moves kept, accepted on reconnect) and
  a reload mid-run, which resumes at exactly the tick it left. All pass.
- Screenshots: `audit/shots/2026-11-20-arcade/`.
- Not tested: real phones, iOS Safari or Android Chrome on a device, Firefox, Edge, LINE's
  in-app browser, a screen reader, real SMS delivery, in-store scanning with a real camera.

## Requirements

| Brief | Requirement | Status | Where / evidence |
|---|---|---|---|
| p2 | Game, phone recovery, wheel, verified boards, weekly worker, wallet, staff redemption | Done | All below |
| p2 | Three distinct weekly winners, one position each, best eligible score | Done | `competition.mjs` `bestPerPlayer`, `finalizeOne`; API test "week: …" |
| p2 | Namespaced styles, lazy-loaded assets | Done | `.bba` prefix in `arcade.css`; the site imports `arcade/arcade.js` only on a press (checked: no request before it) |
| p3–4 | Burger Bro tokens, Anton / Libre Franklin / Space Mono / Kanit, 2px outlines, offset shadows, 90–160 ms presses | Done | `arcade.css` reads the site's own variables |
| p4 | Pixel art for ingredients and the emblem; readable type for forms and terms | Done | `render.js` tiles; forms in Libre Franklin |
| p4 | Grain and scanlines kept off QR, OTP and cells | Done | None are used anywhere |
| p4 | Brief line-clear flash, prize reveal, small confetti; reduced motion honoured; mute remembered | Done | `game.js` flash (90 ms when reduced), wheel without turning and no confetti when reduced, sound choice in `localStorage` |
| p4 | Piece types differ by value, pattern and outline, not only colour | Done | `render.js` (stripes, holes, grill marks, seeds, ring, wave, dots) |
| p4 | Entry copy "Win a coupon": tooltip on desktop hover/focus, words always visible on touch | Done | Site entry, see the website log (A01) |
| p5 | Seven four-cell shapes, one ingredient each (I bacon, O cheddar, T patty, L bun, J pickle, S lettuce, Z tomato); art never changes collision | Done | `engine.js` `INGREDIENT`, `render.js`; engine tests |
| p5 | Visible 10×20 board, hidden spawn rows, same artwork in board, next and hold; outline-only ghost | Done | `engine.js` (2 hidden rows), `render.js` |
| p6 | Desktop layout: board first, player status left, weekly competition right; pause, sound and exit with focus states; no promotions during play | Done | Screenshot `game-start-chromium-1280.png` |
| p6 | Keyboard: arrows, ↓ soft, ↑/X clockwise, Z counter-clockwise, Space hard, C hold, P/Esc pause | Done | `arcade.js` `KEYMAP`; Escape pauses first, a second Escape leaves |
| p7 | Phone: board and controls fit; cell = floor(min(w/10, h/20)); ≥44 px targets; hard drop apart from movement; held movement repeats; touch handling only on the pad; leaderboard and rewards behind their own screens | Done | `game.js` `layout`; `.bba-pad`; layout checks above |
| p7 | 320, 375, 390 px and short landscape/portrait: no cropped rows or hidden controls | Done | Layout checks above |
| p8 | Emblem beside Order; mobile Order now + Win a coupon row; sheet entry; register only after choosing the arcade; recognised players go to the lobby; close returns to where they were | Done | Website log (A01); `openArcade`, `closeArcade` restore focus |
| p9 | Username 3–16 letters, digits, underscore; trimmed; case-insensitive unique; blocked words | Done | `auth.mjs` `checkUsername`; test "account: username rules" |
| p9 | +66 default with a country selector; E.164 via a maintained parser | Done | libphonenumber-js 1.13.15 (max metadata) |
| p9 | Short-lived OTP verified on the server; paste/autofill; numeric keyboard; expiry; resend cooldown; recoverable errors | Done | 5-minute code, 45 s cooldown, 5 attempts; `autocomplete="one-time-code"`, `inputmode="numeric"`, six digits submit themselves |
| p9 | Account only after verification; a name taken meanwhile keeps the verified phone and asks for another | Done | Test "a name taken during the code step…" |
| p10 | One account per phone; restore on a new device; no new code each game; username change keeps the player id; phone change by verification | Done | Tests; `changeUsername` (30 days), `changePhoneVerify` |
| p10 | Confirmation SMS with the exact template, after the account is committed, separate from the OTP, one outbox event per account, reconciled before any retry | Done, not live | `queueConfirmation`, `worker.processOutbox`; test "a worker restart mid-send…" |
| p10 | HttpOnly cookie sessions, rate limits by phone, IP and session; never reveals whether a number has an account; phones and OTPs out of boards, QR, analytics and logs | Done | `auth.mjs`, `util.log` filter; tests |
| p10 | Thailand sender configuration checked before live delivery | Owner | README → "Before this can go live" |
| p11 | Scoring 100/300/500/800 × level at lock, soft 1 and hard 2 per cell; level table; gravity formula; 60 Hz; lock delay 30; 15 resets; seven-bag; SRS kicks; hold once; ghost; no combos | Done | `engine.js`; engine tests |
| p11 | Four lines become eight: full score, lines kept, pause, Level 2 at 8 of 15 | Done | Engine test "milestone example" |
| p11 | Frame rate never changes the result | Done | Engine test "whatever the frame rate" (1, 2 and 5 ticks per frame) |
| p11 | Pause on a hidden tab; idle and lifetime limits on the server; resume from an accepted checkpoint | Done | `visibilitychange`; `expireRuns`; layout check "resumed at tick …" |
| p12 | Board frozen at Level 1; the choice shown only after the server verified it; exact forfeit copy; spin and continue can't both succeed; another tab gets the committed choice | Done | Test "spin and continue cannot both succeed…"; screenshot `choice-*` |
| p12 | One issued spin per player per Bangkok day; when used, it's explained and Keep stacking stays open; opening the arcade or asking for a code uses nothing | Done | Test "one spin per Bangkok day"; browser run 2 |
| p13 | The server draws (crypto random) and the wheel only reveals; one transaction (choice, allowance, stock, draw, coupon); rolled back if anything fails; refresh never rerolls; real chances shown; exhausted prizes can't win | Done | `drawAndIssue`; test "stock cannot be oversold"; "Chances on the wheel" list; segment size = weight |
| p13 | Test rewards clearly marked; no sample offer presented as real | Done | "TEST" on the wheel reveal, wallet, receipt and staff page |
| p14 | This week / All-time / My scores; best eligible run per player; Monday 00:00 Bangkok, end exclusive; run bound at start; ties by score, level, earlier receipt, run id; wait for pending runs; three distinct accounts once; top ten plus own rank; points to beat third; frozen rules and prizes | Done | `competition.mjs`; week tests; screenshot `board-*` |
| p15 | Wallet: Available, Redeemed, Expired; benefit, source, backup code, expiry, branches, conditions; plain high-contrast QR with an unguessable token; kept after the week resets | Done | `wallet()`; screenshot `wallet-*`; the QR holds only `BBC1:<token>` |
| p15 | Points as an append-only ledger with unique sources; no cash value | Done | `points_ledger`; test "points…" |
| p15 | Redemption channel stated: not GrabFood or LINE MAN | Done | Wallet and receipt copy |
| p16 | Scan is a lookup; redemption is an explicit authenticated action; concurrent attempts redeem once; branch, expiry and status checked; staff see only what they need; admin changes audited with a reason; GET or a QR never uses a coupon | Done | `staff.mjs`; test "staff: …"; browser staff steps |
| p17 | Server-owned run id, seed, rules version, week; inputs and checkpoint fingerprints replayed; finish receipt before verification; one active run; CORS limited; CSRF; suspicious patterns held for review | Done | `runs.mjs`; tests |
| p18 | Data model with constraints (one active run, unique spin per run and per day, unique award per week/place and week/player, unique source refs, unique redemption per coupon) | Done | `migrations/001_init.sql` |
| p19 | API contract and run states; idempotency keys bound to the request | Done | README → API; test "checkpoints are idempotent" |
| p20 | Awkward moments: slow or expired OTP, offline at Level 1, lost spin response, another tab, session expiry, finish at the cut-off, worker restart, used/expired coupon, redacted logs; 60-minute run and 10-minute idle limits | Done | Tests and browser offline check |
| p21 | Acceptance matrix | Done, with the limits under Evidence | This file |
| p22 | .env.example without secrets, migrations, seed data, worker schedule, README; /burger-bro/ base path and direct refresh | Done | `arcade-server/README.md`; `/burger-bro/arcade/` → `play.html` |
| p22 | Missing live credentials, branch facts and prize terms marked as set-up items; the demo SMS adapter blocked in production | Done | README; `config.mjs` refuses `demo` when `APP_ENV=production` |
| p51 | One wallet for spins, weekly prizes and points; restaurant animation paused during play; context restored on exit | Done | `bb:arcade-open/close` (site side in the website log) |
| p54 | Other minigames | Not built, as the brief says | — |

## For Burger Bro to supply or decide

- Real wheel prizes, their chances, stock, expiry, branches and conditions; and the three
  weekly prizes. Everything is TEST now.
- An SMS provider with a Thailand-approved sender (the Twilio adapter is written and not yet
  run with real credentials).
- Hosting on the restaurant's own domain for the site and the API together (cookies), with
  backups. The public preview on github.io cannot hold a first-party arcade login.
- Staff accounts per branch, and an in-person rule for a customer who has lost their number.
- Privacy wording for the arcade, and how long accounts and runs are kept.

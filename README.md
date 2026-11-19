# Burger Bro! — website

Static site for Burger Bro (Rama 9 and Pattanakarn, Bangkok): the homepage `index.html` (inline CSS and vanilla JavaScript) and the full menu page `menu/`, photos in `media/`. No build step for the site, no libraries.

Live: https://mpc0367.github.io/burger-bro/ (GitHub Pages, `main` branch, repository root).

## Layout

| Path | What it is |
|---|---|
| `index.html` | The homepage: markup, styles, Thai dictionary, script. **Its menu HTML is the one source of the menu.** |
| `menu/index.html` | The full menu page (`/burger-bro/menu/`): search, category and protein filters, photo/details view, branch-aware ordering. `menu.js`, `menu.css` are its own; `menu-data.js` and `home.css` are **generated** from `index.html` (see "One menu, two pages") |
| `shared/site.js` | Shared by both pages: the language/branch resolver (`BBPrefs`), the branch facts (`BB_BRANCHES`), Bangkok open-now (`BBSite.openState`) and `bbTrack` |
| `tools/menu-data.mjs`, `tools/menu-parity.mjs` | Generate the menu page's data and styles from the homepage; check they are current (Node, no dependencies) |
| `media/*.jpg` | Site photos (hero, burger section, shop) and 22 official menu photos from the shop's LINE MAN listings, each with a `-640` / `-960` resized copy |
| `media/replaced/` | Four original menu photos that the official shots replaced. Kept for reference; nothing links to them. |
| `media/seq/f00.jpg … f48.jpg` | 49 frames for the burger story (640×853, with a baked red studio background) |
| `media/favicon.svg` | The nav badge as a favicon |
| `audit/` | Findings, inventory, before/after reconciliation and screenshots from the V2 pass; `arcade-audit-2026-11-19.md` is the evidence log for the 19 Nov 2026 website audit (A01–A13) and the revised brief (B01–B06, menu page, story) |
| `arcade/` | The coupon arcade, loaded only when a visitor presses an arcade entry (see below) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. Keep it. |

All asset paths are relative (`media/…` on the homepage, `../media/…` on the menu page, never `/media/…`), so the site works under `/burger-bro/` and at a domain root (`/` and `/menu/`) alike. The menu page is a real file (`menu/index.html`): it opens directly, reloads and can be bookmarked with no redirect trick.

## Preview locally

Serve the page under the same `/burger-bro/` base path as GitHub Pages, e.g. from the folder that contains `burger-bro/`:

```bash
npx http-server -p 4173      # or any static server; python's http.server works too where Python is usable
```

Then open `http://localhost:4173/burger-bro/` and `http://localhost:4173/burger-bro/menu/`. (On the studio Mac, Python fails under `~/Documents`; use a Node static server.)

## Deploy

Anything pushed to `main` is live about a minute later. Work on a branch, check it locally, then merge to `main`.

## Editing content

- **English text** is in the HTML. **Thai text** is in the `window.BB_TH` object near the bottom, matched by each element's `data-i18n` key. Menu item names stay in English in both languages.
- **Prices** are plain text in the menu rows. The receipt at the bottom is a fixed illustration and does not read from the menu.
- **After any change to the homepage menu or its Thai text, or to the homepage styles, run** `node tools/menu-data.mjs` (regenerates `menu/menu-data.js` and `menu/home.css`) and `node tools/menu-parity.mjs` (fails if the menu page and the homepage disagree).
- **Opening hours (Rama 9) appear in seven places.** Change all of them together: the hours table, `hours` in `shared/site.js` (drives "Open now / closes soon"), `hero.meta1`, `nav.meta`, `mq.1`, `break.meta`, and the JSON-LD block in `<head>`.
- **Phone** (`tel:+66827938855`, shown as 082-793-8855) appears in Find us, the footer and `tel` in `shared/site.js`.
- **New text keys** need a Thai entry in `window.BB_TH`. Besides `data-i18n` (inner HTML), `data-i18n-alt` (`@alt:` keys), `data-i18n-aria` (`@aria:` keys) and `data-i18n-ph` (`@ph:` keys, placeholders) are translated. On a Thai page, text the dictionary leaves in English (dish names) gets `lang="en"`; `data-lang-en` / `data-lang-th` give an element's own language on each page (the second address line).

## Branches: one model, one way to choose

`BB_BRANCHES` in `shared/site.js` holds each branch's facts and links: map position, Google listing, directions, map embed, LINE MAN, GrabFood (+ QR), phone and hours. On the homepage the map tabs, the Find us panel, the footer's ordering buttons, the full-menu links and "Open now" all follow the one chosen branch; on the menu page its branch selector drives its ordering buttons. The JSON-LD in `<head>` repeats these facts for search engines: keep it in step by hand.

**Every branch choice goes through one function** (`chooseBranch(i, origin)` on the homepage). Deliberate origins — a map tab, a map marker, the footer switch, a panel's "Show it", a "Nearest to me" result the visitor asked for, the menu page's selector — count as the visitor's choice: they are saved (`bb-branch`), put in the address (`?branch=pattanakarn`, `history.replaceState`) and numbered. A location answer that arrives later checks that number first, so it can never undo a newer manual choice.

**Which branch and language first (both pages, `BBPrefs.resolve`):** a valid value in the address (`?branch=`, `?lang=`) wins, then the visitor's saved choice, then the default (Rama 9, English). Invalid values are ignored. A value from the address is shown but not saved, so a shared link never changes someone's own setting — and a stale saved Thai never overrides `?lang=en`. Links between the two pages carry both (`BBPrefs.carry`).

**Pattanakarn has only its name, address, position, Google listing and LINE MAN link confirmed.** Its hours, phone, Grab link and facilities are `null` in `BRANCHES` and its Find us panel says plainly that they are not confirmed yet (with its Google listing); nothing of Rama 9's is shown for it. The old line "Burger Bro & Steak · in the gas station · 11:00–22:00" was taken down on 19 Nov 2026 pending the owner's confirmation. When the owner supplies a fact: fill it in `shared/site.js`, replace the "not confirmed" text in panel 1 (`find.pk.*` keys, EN and TH), and add it to the second JSON-LD entity.

**Open now / closes soon** (Rama 9 only) is worked out from `hours` (`shared/site.js`) in Bangkok time (UTC+7), including the Fri/Sat opening that runs to 02:00. "Closes soon" is the last hour. It makes no holiday guesses and shows no waiting times; a branch without confirmed hours shows nothing.

## Delivery links

foodpanda Thailand closed in May 2025 and is not linked.

- **Delivery follows the branch.** The footer has a branch switch (Rama 9 | Pattanakarn) that is the same choice as the map tabs: choosing a branch in either place sets the LINE MAN button to that branch's own shop page (`lineman` in `BRANCHES`; the shop's own short links of Nov 2026, resolved) and "Walk in" to its Google listing. The Call button shows only for a branch whose number is confirmed (`tel`; Rama 9 today). A line above the buttons names the branch being ordered from, and a line under them says the order is placed and paid in the delivery app, not on this site. foodpanda is not offered: it stopped operating in Thailand. Robinhood was removed on 17 Nov 2026: its listings could not be confirmed. GrabFood has no restaurant web pages in Thailand any more; a per-branch link has to be a share link copied from the Grab app.
- **GrabFood:** follows the branch like LINE MAN (`grab` in `BRANCHES`). Rama 9 opens the shop's own GrabFood page through its share link from the Grab app (`https://app.grab.com/s/olrOpBCF`, merchant `3-C4M1A7CXNBAJJ6`). A branch without a verified link (Pattanakarn, until its share link is supplied) gets an outline button labelled "Find Pattanakarn on Grab" that opens Grab's general page, with a note to search there; LINE MAN stays the strong button. GrabFood has no restaurant web pages in Thailand: a link must be copied from the Grab app (shop page → Share). On a phone the button opens the shop in the Grab app. On a computer Grab's share link only lands on Grab's general page, so the button opens a panel with the branch's QR code to scan instead (`grabQr` in `BRANCHES`, `media/grab-rama9-qr.png`; make a new code for a new link with any QR generator, plain black on white).
- The hero "Order delivery", the phone action row's "Order now" and the "Order the signature" button all jump to the footer order section (`#order`), where the two provider buttons are.

## Photos

Each photo exists at three widths. If you replace `media/name.jpg`, regenerate `name-640.jpg` and `name-960.jpg` from it and keep the file names.

## The homepage menu (kept exactly as it was)

The homepage menu's content, appearance and photo interaction are the owner's baseline and are unchanged from `main` (24d07dd): a menu row with a `data-img` attribute shows its photo on hover with a mouse or trackpad on any window wider than 900px, when it scrolls to mid-screen (phones), as a thumbnail on wide screens that cannot hover (tablets), and through a Photo button that only appears on keyboard focus. Only non-visual fixes were made: menu photos are fetched ahead at the browser's normal priority (only the hero photo is high priority), dish names are marked `lang="en"` on a Thai page, and a Reduce Motion change applies without a reload. One link was added at the foot: **View full menu →** (to `menu/`, carrying language and branch). The row's `data-protein` attribute (invisible) feeds the full menu page's protein filter; it lists only what the row's own words say (the B P C marks, "pork", "bacon", "ham", "chicken", "fish", "shrimp", "Angus", "wagyu … beef", "rib eye"). Add `data-img` only when the picture really is that item.

## One menu, two pages

The full menu page (`menu/`) uses **the same data and the same row styles** as the homepage, never a hand copy: `node tools/menu-data.mjs` reads the homepage's menu HTML and Thai dictionary and writes `menu/menu-data.js` (categories, 27 items with stable ids such as `burger-bro` and aliases such as `b1`, EN/TH names and descriptions, prices exactly as shown, B/P/C markers, proteins, tags, photos and alt text, add-ons, value sets and tax wording) and `menu/home.css` (the homepage stylesheet). `node tools/menu-parity.mjs` fails if either is out of date. On the menu page: Back to Burger Bro, the branch being ordered from, **Search menu** (EN and TH text, ids and aliases; a missing Thai translation never hides a dish), category buttons, protein filters (only proteins the data has), **Reset filters**, a result count, an empty state, a photo/details view (button on every row; a dialog that returns focus to its button) and the same branch-aware LINE MAN / GrabFood hand-off as the homepage (no basket). Its state is in the address — `?q=`, `?cat=`, `?protein=`, `?item=`, `?branch=`, `?lang=` — so it can be shared, typing replaces the address entry, and Back/Forward restore filters and close an open detail view. It loads no map, no burger sequence and no arcade.

## The burger story

The story (`#bro`) is on warm paper with a soft static cream/mustard glow and a grounded shadow. **One state** — normalised progress 0…1 — drives the frame, the active ingredient, the counter and the five chapter buttons (an ordered list of real buttons with `aria-current="step"`; arrow keys move within the list only). Chapter checkpoints are frames 0, 12, 24, 36 and 48: no frame isolates one layer (the sequence opens the whole burger steadily), so the five sit at even points of the opening.

- **Pinned** (wide ≥1100px, ≥700px tall, motion allowed, and the copy column really fits): the stage holds still under the header and normal page scrolling moves the progress (track ≈ 3.2 usable screens); a chapter button scrolls to its point. Nothing intercepts the wheel.
- **Normal flow** everywhere else (phones, short or narrow windows, 200% zoom, large text, Reduce Motion, data saver): the picture stays in view (sticky under the header stack) while chapters are chosen; a chapter button sets the progress directly. On phones and tablets an optional **Play** previews the sequence back and forth (it never jumps from the last frame to the first) with a persistent Pause; it stops on any chapter choice and rests offscreen, in a hidden tab and while the arcade is open.
- **Fit:** the copy column is `clamp(320px, 31vw, 460px)`; the picture takes the rest of the width and most of the usable height (viewport minus the measured header stack) and is drawn with ONE scale from both axes (contain), never stretched or cropped; the canvas backing store is its CSS size × device pixel ratio (capped at 2). Resizes, font loading, orientation and text-size changes redraw at the current progress.
- **Loading:** poster first (`f00`, or the chapter's still frame); frames load once the story is near, first and nearby frames first, four at a time; a frame counts only if it decoded with a real size. A missing frame keeps the last good one on screen; failed frames are retried (also on `online`). If even the poster frame fails, the shop's photo `bro-profile-960.jpg` shows. Reduce Motion and data saver get still frames per chapter and no sequence download.
- **The frames still carry their baked red studio background**, shown honestly as a framed photograph inside the cream layout. A seamless cream/alpha re-export of the sequence (same camera, anchor and frame size) is an open asset dependency; no colour key, blend mode or per-frame crop is used.

## Map

Find us shows both branches on one map in the site's own colours (paper ground, white streets, expressways in mustard with ink edges, pins styled like the buttons): **Rama 9** and **Pattanakarn** (1348 Phatthanakan Rd). The tabs above it, or a pin, choose a branch (through the one branch-choice function): the map moves to it, "Open in Google Maps" and "Directions" under it follow, and so do the delivery buttons in the footer. The Srinakarin branch closed permanently and was removed on 17 Nov 2026.

- **The visitor's location:** the browser is asked only when the visitor presses **Nearest to me** (top left of the map, under the branch tabs). If they allowed it on an earlier visit it is reused quietly, without a prompt, and the nearest branch is chosen unless they already picked one (a `?branch=` in the address or a saved choice counts as picked). An answer that arrives after a newer manual choice is not applied. If allowed, a "You" dot is drawn and each tab shows its distance. If refused or unavailable the button says "Location is off" and the chosen branch stays. The position is used in the page only and sent nowhere.

- **How it is drawn:** MapLibre GL 5.24.0 from cdnjs (with integrity hashes) on OpenFreeMap's free OpenStreetMap tiles (`tiles.openfreemap.org/styles/positron`, recoloured in `mapPaint` in the script; no key, no account, no cookies). It loads only as the visitor nears Find us. Street names follow the page language.
- **Fallback:** if the library, the tiles or WebGL fail, Google's map of the chosen branch takes the frame (`embed` in `BRANCHES`); visitors without JavaScript get Google's map of Rama 9.
- **Branch data** is in `shared/site.js` (see "Branches: one model"): `lat`/`lng` (from each branch's Google listing), `open`, `dir`, `embed`. Rama 9 opens `https://maps.google.com/?cid=4340520789969302256`, Pattanakarn `?cid=12405364053160930417`.
- The hand-drawn sketch map that Find us had until 10 Nov 2026 is in git history.

## Language and addresses

English is at the plain address and Thai at `?lang=th`, on both pages (`<link rel="alternate" hreflang>` for en, th and x-default; the canonical follows). Which language shows: the shared resolver — a valid `?lang=th` / `?lang=en` in the address first, then the visitor's saved choice, then English. A language from the address is shown but not saved. Switching language with the EN / ไทย button saves it and updates `?lang=` in the address, so a copied link opens as seen. Search indexing is unchanged (no `noindex`); there is a canonical URL and a Restaurant entity per branch in the JSON-LD.

## The arcade (Block Party)

The game, its screens and the staff page are in `arcade/` (`engine.js` the rules shared with the server, `game.js` the loop and checkpoints, `arcade.js` the screens, `staff.html` coupon redemption, `play.html` a direct address). Accounts, scores, prizes and redemption need the trusted server in `../arcade-server/` (its own repository, local only): run it with `npm run dev` there and open `http://localhost:4490/burger-bro/` — it serves this site at the same path as GitHub Pages. **The arcade entries show only where its server is set**: the arcade server writes `<meta name="bb-arcade-api" content="/api/">` into the pages it serves, and a small script in each page's head then shows the "Win a coupon" buttons. On a static host without it (GitHub Pages today) there is no arcade entry at all and **Order now** fills the phone row. To switch the arcade on for a hosted site, add that meta tag with the API's address to `index.html` and `menu/index.html`. Evidence: `audit/arcade-requirements-2026-11-20.md`.

## The arcade entry

Every way into the arcade is a `<button type="button" data-arcade-open>`: the pixel cabinet emblem before **Order** in the desktop header (`.nav-arcade`, "Win a coupon" as a tooltip on hover and keyboard focus; on touch screens the words show beside it), the **Win a coupon** button in the phone action row (`.mob-act-arcade`, with **Order now**, under the header; it stays at the top when the header slides away), and the one beside **Order now** in the phone menu sheet (`.sheet-arcade`). Nothing of the arcade loads before a press: the hook script at the end of `index.html` then imports `./arcade/arcade.js` (the menu page imports `../arcade/arcade.js` the same way) and calls `openArcade({ returnFocus })`; if that fails, a short message says the arcade isn't available and the page carries on. The arcade dispatches `bb:arcade-open` / `bb:arcade-close` on `document`; the page then pauses the marquee, the story's Play and the review carousel, hides the phone action row (`body.bba-open`), and on close resumes them and puts the reading position back. The header, the action row, the menu rail and anchor jumps share one height: `--stack-h` = `--nav-h` + `--act-h` (0 on wide screens, 62px on phones).

## Motion

A change to the Reduce Motion setting is applied in place (never a reload): the marquee, the story (pinning, sequence, Play), the cinema drift and the review carousel rest or resume, and the reading position is held.

## Analytics hook

`window.bbTrack(name, props)` (in `shared/site.js`) does nothing unless `window.BB_ANALYTICS_URL` is set (it is not). Set, it sends `{name, props, t}` with `navigator.sendBeacon`. Only `branch`, `provider`, `locale` and `device` (phone/tablet/desktop) are ever sent — never a phone number, a name or anything typed. Events: `menu_view`, `menu_search`, `branch_select`, `provider_handoff` (a click, not a sale), `arcade_open`.

## QA helpers built into the page

- `?lang=th` opens in Thai without saving the choice; `?lang=en` opens in English even if Thai was saved. `?branch=pattanakarn` opens with Pattanakarn chosen.
- `window.__bbOpenAt("2026-11-21T18:00:00Z")` returns Rama 9's open state at that moment; `window.__broSeqState()` reports the story (decoded/failed frames, frame drawn, progress, chapter, mode) and `window.__broFit()` the picture's fit; `window.__bbChoose(i, origin)` chooses a branch; on the menu page `window.__mpState()` reports its state.
- `?shot=full` renders a static full-length page for screenshots; `?shot=%23menu` jumps a static render to a section. (Shot mode skips the story's sequence: test the story through the normal page.)

## Google reviews

The "Word on the street" section shows **Selected Google reviews** (so labelled, with "checked 17 Nov 2026" from `REV_AS_OF` under the rating): 4 and 5 star Google reviews of the Rama 9 listing, typed into `REVIEWS` in `index.html` word for word from the owner's screenshots (17 Nov 2026), with the 4.4 rating and 913 ratings as seen that day (`REV_RATING`). Nothing is fetched from Google. Each review's photos and profile picture are the reviewer's own, in `media/reviews/` (`<name>.jpg` up to 1440px for the viewer, `<name>-400.jpg` for the strip, `av-<name>.jpg`), **used with each reviewer's permission, which the owner asked for and received (17 Nov 2026)**; each card credits them ("Photos by … · used with permission"). To add a review, get the reviewer's permission first, then add an entry to `REVIEWS` and its files to `media/reviews/`.

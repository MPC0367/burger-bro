# Burger Bro! — website

Static site for Burger Bro (Rama 9 and Pattanakarn, Bangkok). One `index.html` with inline CSS and vanilla JavaScript, photos in `media/`. No build step, no libraries.

Live: https://mpc0367.github.io/burger-bro/ (GitHub Pages, `main` branch, repository root).

## Layout

| Path | What it is |
|---|---|
| `index.html` | The whole page: markup, styles, Thai dictionary, script |
| `media/*.jpg` | Site photos (hero, burger section, shop) and 22 official menu photos from the shop's LINE MAN listings, each with a `-640` / `-960` resized copy |
| `media/replaced/` | Four original menu photos that the official shots replaced. Kept for reference; nothing links to them. |
| `media/seq/f00.jpg … f48.jpg` | 49 frames for the burger breakdown animation |
| `media/favicon.svg` | The nav badge as a favicon |
| `audit/` | Findings, inventory, before/after reconciliation and screenshots from the V2 pass; `arcade-audit-2026-11-19.md` is the evidence log for the 19 Nov 2026 website audit (A01–A13) |
| `arcade/` | The coupon arcade, loaded only when a visitor presses an arcade entry (see below) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. Keep it. |

All asset paths are relative (`media/…`, never `/media/…`), so the site works under `/burger-bro/` and would also work at a domain root.

## Preview locally

Serve the page under the same `/burger-bro/` base path as GitHub Pages, e.g. from the folder that contains `burger-bro/`:

```bash
npx http-server -p 4173      # or any static server; python's http.server works too where Python is usable
```

Then open `http://localhost:4173/burger-bro/`. (On the studio Mac, Python fails under `~/Documents`; use a Node static server.)

## Deploy

Anything pushed to `main` is live about a minute later. Work on a branch, check it locally, then merge to `main`.

## Editing content

- **English text** is in the HTML. **Thai text** is in the `window.BB_TH` object near the bottom, matched by each element's `data-i18n` key. Menu item names stay in English in both languages.
- **Prices** are plain text in the menu rows. The receipt at the bottom is a fixed illustration and does not read from the menu.
- **Opening hours (Rama 9) appear in seven places.** Change all of them together: the hours table, `hours` in `BRANCHES` in the script (drives "Open now / closes soon"), `hero.meta1`, `nav.meta`, `mq.1`, `break.meta`, and the JSON-LD block in `<head>`.
- **Phone** (`tel:+66827938855`, shown as 082-793-8855) appears in Find us, the footer and `tel` in `BRANCHES`.
- **New text keys** need a Thai entry in `window.BB_TH`. Besides `data-i18n` (inner HTML), `data-i18n-alt` (`@alt:` keys), `data-i18n-aria` (`@aria:` keys) and `data-i18n-ph` (`@ph:` keys, placeholders) are translated. On a Thai page, text the dictionary leaves in English (dish names) gets `lang="en"`; `data-lang-en` / `data-lang-th` give an element's own language on each page (the second address line).

## Branches: one model

`BRANCHES` in the script holds each branch's facts and links: map position, Google listing, directions, map embed, LINE MAN, GrabFood (+ QR), phone and hours. The map tabs, the Find us panel, the footer's ordering buttons and "Open now" all follow the one chosen branch (map tabs, pins, the footer switch, and each panel's "Show it" button choose it). The choice is kept in the address as `?branch=pattanakarn` (with `history.replaceState`, no extra history steps), so reloads, back/forward and shared links keep it. The JSON-LD in `<head>` repeats these facts for search engines: keep it in step by hand.

**Pattanakarn has only its name, address, position, Google listing and LINE MAN link confirmed.** Its hours, phone, Grab link and facilities are `null` in `BRANCHES` and its Find us panel says plainly that they are not confirmed yet (with its Google listing); nothing of Rama 9's is shown for it. The old line "Burger Bro & Steak · in the gas station · 11:00–22:00" was taken down on 19 Nov 2026 pending the owner's confirmation. When the owner supplies a fact: fill it in `BRANCHES`, replace the "not confirmed" text in panel 1 (`find.pk.*` keys, EN and TH), and add it to the second JSON-LD entity.

**Open now / closes soon** (Rama 9 only) is worked out from `hours` in Bangkok time (UTC+7), including the Fri/Sat opening that runs to 02:00. "Closes soon" is the last hour. It makes no holiday guesses and shows no waiting times; a branch without confirmed hours shows nothing.

## Delivery links

foodpanda Thailand closed in May 2025 and is not linked.

- **Delivery follows the branch.** The footer has a branch switch (Rama 9 | Pattanakarn) that is the same choice as the map tabs: choosing a branch in either place sets the LINE MAN button to that branch's own shop page (`lineman` in `BRANCHES`; the shop's own short links of Nov 2026, resolved) and "Walk in" to its Google listing. The Call button shows only for a branch whose number is confirmed (`tel`; Rama 9 today). A line above the buttons names the branch being ordered from, and a line under them says the order is placed and paid in the delivery app, not on this site. foodpanda is not offered: it stopped operating in Thailand. Robinhood was removed on 17 Nov 2026: its listings could not be confirmed. GrabFood has no restaurant web pages in Thailand any more; a per-branch link has to be a share link copied from the Grab app.
- **GrabFood:** follows the branch like LINE MAN (`grab` in `BRANCHES`). Rama 9 opens the shop's own GrabFood page through its share link from the Grab app (`https://app.grab.com/s/olrOpBCF`, merchant `3-C4M1A7CXNBAJJ6`). A branch without a verified link (Pattanakarn, until its share link is supplied) gets an outline button labelled "Find Pattanakarn on Grab" that opens Grab's general page, with a note to search there; LINE MAN stays the strong button. GrabFood has no restaurant web pages in Thailand: a link must be copied from the Grab app (shop page → Share). On a phone the button opens the shop in the Grab app. On a computer Grab's share link only lands on Grab's general page, so the button opens a panel with the branch's QR code to scan instead (`grabQr` in `BRANCHES`, `media/grab-rama9-qr.png`; make a new code for a new link with any QR generator, plain black on white).
- The hero "Order delivery", the phone action row's "Order now" and the "Order the signature" button all jump to the footer order section (`#order`), where the two provider buttons are.

## Photos

Each photo exists at three widths. If you replace `media/name.jpg`, regenerate `name-640.jpg` and `name-960.jpg` from it and keep the file names. A menu row with a `data-img` attribute has a visible **View photo** button (mouse, touch and keyboard alike) that opens the photo under the row, with an "Order this →" link that jumps to the order buttons and says the dish has to be chosen again in the delivery app (the apps have their own carts). On a computer the photo also follows the pointer as a hover plate, as an extra (under Reduce Motion it sits by the pointer without the glide and tilt); wide screens that cannot hover (tablets) also get a thumbnail. Phones no longer open photos by scroll position (that shifted the page while reading). Add `data-img` only when the picture really is that item.

Only the hero photo loads with high priority. Menu photos load when asked for: a photo row's picture when its View photo button is pressed, and on a computer each section's pictures when the pointer reaches that section.

## Menu search and filter

Above the section rail: a search over dish names and descriptions (in the language on screen and in English), protein filters (All, Beef, Pork, Chicken, Fish & shrimp), an item count, a clear button and a no-results message. Each row's proteins are in its `data-protein` attribute, written only from the menu's own words (the B P C marks, "pork", "bacon", "ham", "chicken", "fish", "shrimp", "Angus", "wagyu … beef", "rib eye"); a dish whose words name no meat has none. No dietary or allergen filter: the shop has not confirmed that information. Jumping between sections keeps the search and filter.

## Map

Find us shows both branches on one map in the site's own colours (paper ground, white streets, expressways in mustard with ink edges, pins styled like the buttons): **Rama 9** and **Pattanakarn** (1348 Phatthanakan Rd). The tabs above it, or a pin, choose a branch: the map moves to it, "Open in Google Maps" and "Directions" under it follow, and so do the delivery buttons in the footer. The Srinakarin branch closed permanently and was removed on 17 Nov 2026.

- **The visitor's location:** the browser is asked only when the visitor presses **Nearest to me** (top left of the map, under the branch tabs). If they allowed it on an earlier visit it is reused quietly, without a prompt, and the nearest branch is chosen unless they already picked one (a `?branch=` in the address counts as picked). If allowed, a "You" dot is drawn and each tab shows its distance. If refused or unavailable the button says "Location is off" and the chosen branch stays. The position is used in the page only and sent nowhere.

- **How it is drawn:** MapLibre GL 5.24.0 from cdnjs (with integrity hashes) on OpenFreeMap's free OpenStreetMap tiles (`tiles.openfreemap.org/styles/positron`, recoloured in `mapPaint` in the script; no key, no account, no cookies). It loads only as the visitor nears Find us. Street names follow the page language.
- **Fallback:** if the library, the tiles or WebGL fail, Google's map of the chosen branch takes the frame (`embed` in `BRANCHES`); visitors without JavaScript get Google's map of Rama 9.
- **Branch data** is in `BRANCHES` (see "Branches: one model"): `lat`/`lng` (from each branch's Google listing), `open`, `dir`, `embed`. Rama 9 opens `https://maps.google.com/?cid=4340520789969302256`, Pattanakarn `?cid=12405364053160930417`.
- The hand-drawn sketch map that Find us had until 10 Nov 2026 is in git history.

## Language and addresses

English is at the plain address and Thai at `?lang=th` (`<link rel="alternate" hreflang>` for en, th and x-default; the canonical follows). Which language shows: a valid `?lang=th` / `?lang=en` in the address first, then the visitor's saved choice, then English. A language from the address is shown but not saved. Switching language with the EN / ไทย button saves it and updates `?lang=` in the address, so a copied link opens as seen. Search indexing is unchanged (no `noindex`); there is a canonical URL and a Restaurant entity per branch in the JSON-LD.

## The arcade entry

Every way into the arcade is a `<button type="button" data-arcade-open>`: the pixel cabinet emblem before **Order** in the desktop header (`.nav-arcade`, "Win a coupon" as a tooltip on hover and keyboard focus; on touch screens the words show beside it), the **Win a coupon** button in the phone action row (`.mob-act-arcade`, with **Order now**, under the header; it stays at the top when the header slides away), and the one beside **Order now** in the phone menu sheet (`.sheet-arcade`). Nothing of the arcade loads before a press: the hook script at the end of `index.html` then imports `./arcade/arcade.js` and calls `openArcade({ returnFocus })`; if that fails, a short message says the arcade isn't available and the page carries on. The arcade dispatches `bb:arcade-open` / `bb:arcade-close` on `document`; the page then pauses the marquee, the burger sequence and the review carousel, hides the phone action row (`body.bba-open`), and on close resumes them and puts the reading position back. The header, the action row, the menu rail and anchor jumps share one height: `--stack-h` = `--nav-h` + `--act-h` (0 on wide screens, 62px on phones).

## Motion

A change to the Reduce Motion setting is applied in place (never a reload): the marquee, the burger sequence, the cinema drift and the review carousel rest or resume, and the reading position is held. The 49-frame burger sequence counts frames that really decoded; up to 4 failed frames are drawn as their nearest good neighbour, more than that (or a failed draw) keeps the still photo.

## Analytics hook

`window.bbTrack(name, props)` does nothing unless `window.BB_ANALYTICS_URL` is set (it is not). Set, it sends `{name, props, t}` with `navigator.sendBeacon`. Only `branch`, `provider`, `locale` and `device` (phone/tablet/desktop) are ever sent — never a phone number, a name or anything typed. Events: `menu_view`, `menu_search`, `branch_select`, `provider_handoff` (a click, not a sale), `arcade_open`.

## QA helpers built into the page

- `?lang=th` opens in Thai without saving the choice; `?lang=en` opens in English even if Thai was saved. `?branch=pattanakarn` opens with Pattanakarn chosen.
- `window.__bbOpenAt("2026-11-21T18:00:00Z")` returns Rama 9's open state at that moment; `window.__broSeqState()` reports decoded/failed sequence frames.
- `?shot=full` renders a static full-length page for screenshots; `?shot=%23menu` jumps a static render to a section.

## Google reviews

The "Word on the street" section shows **Selected Google reviews** (so labelled, with "checked 17 Nov 2026" from `REV_AS_OF` under the rating): 4 and 5 star Google reviews of the Rama 9 listing, typed into `REVIEWS` in `index.html` word for word from the owner's screenshots (17 Nov 2026), with the 4.4 rating and 913 ratings as seen that day (`REV_RATING`). Nothing is fetched from Google. Each review's photos and profile picture are the reviewer's own, in `media/reviews/` (`<name>.jpg` up to 1440px for the viewer, `<name>-400.jpg` for the strip, `av-<name>.jpg`), **used with each reviewer's permission, which the owner asked for and received (17 Nov 2026)**; each card credits them ("Photos by … · used with permission"). To add a review, get the reviewer's permission first, then add an entry to `REVIEWS` and its files to `media/reviews/`.

# Website audit A01–A13 — evidence log (19 Nov 2026)

Brief: `../documents/Burger_Bro_Arcade_and_Website_Audit_Claude_Prompt.pdf`, pages 23–30 (audit), 8 and 25 (arcade entry).
Branch: `arcade-2026-11-19`. Nothing pushed, merged or deployed. The arcade itself (`arcade/`) is built separately; this pass adds only the entry points and the hook that loads it.

## How it was checked

- Served locally with a small Node static server mapping `/burger-bro/` to this folder (same base path as GitHub Pages).
- Playwright (from the Suan Zen site's `node_modules`), **Chromium and WebKit**, one scripted suite (kept outside the repo) covering every item below. Result: **133 of 133 checks passed in Chromium and 133 of 133 in WebKit** (final run, 19–20 Nov 2026).
- Widths 320, 375, 390 and 1280 px × EN and TH × Rama 9 and Pattanakarn: no horizontal overflow (also after scrolling the whole page), no console or page errors, `lang` on `<html>` right.
- `arcade/arcade.js` was blocked in every test (it does not exist on this branch yet), so the failure path is what was tested.
- Screenshots: `shots/2026-11-19/` (Chromium, 2× pixel density).
- Not tested: a real phone, LINE's in-app browser, Safari on iOS, a screen reader; no before/after performance traces were taken (see A09).

## A01 — mobile ordering and the arcade entry (P1) — done

- **Phones (≤ 900 px):** a fixed action row under the 64 px header, `#mobAct`: **Order now** (`#order`) + **Win a coupon** with the pixel cabinet icon, always visible on touch, 44 px targets, safe-area insets on the sides. When the header auto-hides (it does, on scrolling down past 220 px) the row slides to the top and stays. Hidden while the arcade is open (`body.bba-open`).
- **One header-stack height:** `--stack-h` = `--nav-h` + `--act-h` (`--act-h` is 0 on wide screens, 62 px on phones). Used by the menu rail's sticky `top` (and `--act-h` when the header is hidden), every anchor's `scroll-margin-top`, the menu sections' scroll margin, the rail's "you are here" line and the hero's top padding.
- **Desktop:** an original pixel-art arcade-cabinet SVG button (`.nav-arcade`) just before **Order** in `.nav-right`, accessible name "Win a coupon" / "ลุ้นรับคูปอง". Its tooltip shows on hover and on keyboard focus, is absolutely placed under the header (the header stays 72 px) and is `pointer-events: none`, so it is outside the click area. On touch-only screens wider than 900 px the words show beside the icon instead of as a tooltip.
- **Menu sheet:** a **Win a coupon** button beside **Order now**; pressing it closes the sheet and focus returns to the menu button.
- **Hook (exact):** every entry is `<button type="button" data-arcade-open>`. One click listener on `document` imports `./arcade/arcade.js` (relative to the page), then calls `mod.openArcade({ returnFocus: theButton })` (the menu button when pressed from the sheet). While loading all entries carry `aria-busy="true"` (the icon blinks; still under reduced motion). On failure: a toast "The arcade isn't available right now." / "ตอนนี้ยังเล่นเกมไม่ได้ ลองใหม่ภายหลังนะ", nothing else. Nothing arcade-related loads before a press (checked in the network log). The hook is its own `<script>`, so a browser without `import()` loses only the arcade. The page listens for `bb:arcade-open` / `bb:arcade-close` on `document`: on open it pauses the marquee, the burger sequence and the review carousel and adds `body.bba-open`; on close it resumes them and restores the scroll position (tested by dispatching both events).
- Checked: row visible and 44 px at 320/375/390 in EN and TH with no overflow; row at the top after the header hides; tooltip visible on keyboard focus with the header unchanged; toast from the row, the desktop emblem and the sheet; quiet/restore on the two events.

## A02 — one branch model (P1) — done

- `BRANCHES` in the script holds each branch's position, Google listing, directions, map embed, LINE MAN, Grab (+ QR), phone and hours. The map tabs, pins, Find us panel, footer ordering buttons, Call/Walk-in, the "ordering from" line and Open now all follow the one chosen branch; the old per-tab `data-*` attributes are gone.
- Find us has one panel per branch. **Pattanakarn shows only its confirmed facts** (name, address EN+TH, Google listing, LINE MAN) and says plainly, in EN and TH, that its hours, phone, Grab link and facilities are not confirmed yet, with a link to its Google listing. Nothing of Rama 9's is shown for it.
- The choice is kept in the address (`?branch=pattanakarn`, `history.replaceState`): reload and back-navigation from another page keep it (tested). Each panel has a "Show it" button for the other branch (focus moves to the new panel's heading).
- **Removed pending the owner:** the old Find us line "BRANCH 2 — BURGER BRO & STEAK · 1348 PATTANAKARN RD (IN THE GAS STATION) · 11:00–22:00". The 11:00–22:00 hours contradict "no confirmed hours"; "& Steak" and "in the gas station" are not in the confirmed facts either. They can come back once the owner confirms them.
- Checked in EN and TH, both branches, both selectors (map tabs and footer switch).

## A03 — Pattanakarn on Grab (P1) — done

- No verified Pattanakarn Grab link exists. For Pattanakarn the Grab button reads "Find Pattanakarn on Grab" / "หาสาขาพัฒนาการใน GRAB", becomes an outline button (LINE MAN stays the strong mustard one), opens Grab's general page, and a note says to search there and that LINE MAN goes straight to the branch (and that the phone is not confirmed).
- Rama 9 keeps its verified share link and the desktop QR panel (tested: the panel opens with `grab-rama9-qr.png`).
- A line under the buttons says the order is chosen and paid in the delivery app, not on this site (no coupon promise anywhere).

## A04 — the 49-frame sequence (P1) — done

- Successful decodes (`decode()` resolved **and** `naturalWidth > 0`) and failures are counted separately, each frame once. The canvas is used only if at most 4 frames failed **and** the first draw succeeds; a missing frame is drawn as its nearest good neighbour; a draw that throws marks that frame bad, and if nothing can be drawn the page goes back to the still photo. `has-brovideo` is added only after the first successful draw.
- Tested at 1280 px: all frames (49 ok, canvas on), one frame aborted (48 ok, canvas on), one frame served as broken data (48 ok, canvas on), all frames aborted (0 ok, canvas off, photo shown). No errors.

## A05 — no reload on a motion-preference change (P1) — done

- `window.location.reload()` is gone. The change is applied in place: CSS already stills reveals, the marquee, the loader, the sticky descent and the cinema drift; scripted parts register hooks (marquee set up on demand, sequence loop stopped/started, burger list static or stepped, cinema drift paused, review carousel auto-paused and resumed unless the visitor paused it, hover plate without glide).
- The burger descent collapses from 430 vh to a static list under reduced motion, which moves everything below it. The page keeps the block being read in place (the reading anchor is held across the change; native scroll anchoring is paused for that moment so it isn't corrected twice).
- Tested both ways (motion → reduced → motion, and starting reduced): no reload (a marker on `window` survived), the menu search text survived, the reading position held — exact in WebKit; in Chromium within about 20 px (Chrome's own scroll anchoring timing), measured on the menu's search box.

## A06 — language precedence (P2) — done

- A valid `?lang=en|th` in the address wins, then the saved choice, then English — in the pre-paint script and in the page script. A language from the address is shown, not saved. Switching saves the choice and updates `?lang=` with `history.replaceState`.
- Tested: saved Thai + `?lang=en` → English; saved English + `?lang=th` → Thai (and saved choice unchanged); saved Thai and no parameter → Thai; switching → address and saved choice updated.

## A07 — accessible labels follow the language (P2) — done

- Translation now covers `aria-label` (new keys for the cinema section, value sets, "good to know", the protein filter, the burger canvas, the arcade emblem), `alt`, and placeholders (`data-i18n-ph`). Elements are looked up on every switch, so copies made later (marquee clones, menu buttons) translate too.
- On a Thai page, text the dictionary leaves in English (dish names) gets `lang="en"`; the second address line in each panel gets the right `lang` both ways (`data-lang-en` / `data-lang-th`). Map zoom buttons, the map pins, "You", "Nearest to me" / "Location is off", the review texts and the "order this" note re-render on switching.
- Tested in TH and back to EN.

## A08 — menu: stable photos, search and filters (P2) — done

- The phone scroll spotlight (which opened 212 px photo panels by scroll position) is removed; tested that no row changes height while scrolling the menu on a 390 px phone. Every photo row has a visible **View photo** button (mouse, touch, keyboard), which opens the photo under its own row (rows above never move). Desktop hover plate kept as an extra; tablets that cannot hover keep thumbnails.
- Search over names and descriptions (screen language + English), protein filters **All / Beef / Pork / Chicken / Fish & shrimp** from `data-protein` on each row (written only from the menu's own words; e.g. Hot Dog's "smoked sausage" names no meat, so it has none), an item count ("12 of 27 items"), a clear button, a no-results message, a "nothing here" line per empty section. Category links keep the filter (tested). Price/VAT wording and the rail unchanged. No dietary or allergen filters.
- "Order this →" inside an open photo jumps to the order section and shows: "Find <dish> in the delivery app and add it there — nothing is added for you from this site." (EN/TH).

## A09 — image priority (P2) — done (not measured)

- Only the hero photo has `fetchpriority="high"`. The eager high-priority warming of all 23 menu photos is removed: a photo loads when its View photo button is pressed, and on a computer a section's photos are fetched (normal priority) when the pointer reaches that section, so the hover plate is usually ready. Data-saver visitors get no warming and no sequence. Tested: no menu photo requested at load at 1280 px.
- **Not done:** comparable before/after mobile traces. The brief asks for them before claiming any speed gain; none is claimed.

## A10 — review star contrast (P2) — done

- Stars are now `--red` (#C42B1C) on the review cream (#EDE2CC): about 4.4:1 (was about 1.7:1 in gold). A visible numeric "5/5" sits beside them (the stars keep their spoken label).

## A11 — location only when asked (P2) — done

- The automatic location request when the map or order buttons scrolled into view is gone. If permission was already granted (Permissions API) it is reused quietly as before; otherwise the browser is asked only after **Nearest to me** is pressed (now a 44 px button with a pin icon, top left of the map, under the branch tabs). After a refusal the button reads "Location is off" and the visitor's branch stays. A branch the visitor chose (tabs, pins, footer, `?branch=`) is never overridden except by pressing Nearest to me.
- Tested with a stubbed geolocation: no request while scrolling to the map and the order section; denial keeps Rama 9 and shows "Location is off"; allowing picks Pattanakarn for a position near it.

## A12 — review provenance (P2) — done

- The set is labelled "Selected Google reviews" (carousel label, footer line "SELECTED GOOGLE REVIEWS — A HAND-PICKED SET OF 4 AND 5 STAR REVIEWS OF RAMA 9, NOT A LIVE FEED", and under the rating "Selected Google reviews · checked 17 Nov 2026" from `REV_AS_OF`; Thai date in the Buddhist year). The "used with permission" line and the link to all reviews are unchanged. Review content untouched.

## A13 — launch metadata (P2) — done

- JSON-LD is a `@graph` of two `Restaurant` entities: Rama 9 as before plus `@id`, `url`, `geo` and `hasMap`; **Pattanakarn with only confirmed facts** (name "Burger Bro Pattanakarn", street address, Bangkok, TH, `geo` and `hasMap` from its tab data — no hours, phone, price range or cuisine).
- Canonical `https://mpc0367.github.io/burger-bro/`; `hreflang` en (plain address), th (`?lang=th`), x-default (plain address) — `?lang=th` is a real alternate (A06), and the canonical follows the language shown. Title now names both branches.
- Indexing unchanged: there was no `noindex`/robots meta before and there is none now.

## Roadmap items built

- **Open now / closes soon** (Rama 9 only): from `hours` in `BRANCHES`, Bangkok time (UTC+7, no DST), including Fri/Sat to 02:00 and the after-midnight hours that belong to the night before; "closes soon" is the last hour; "Closed now · opens 11:00" otherwise. A note says it is Bangkok time from the table below and that holidays may differ. No waiting times. Pattanakarn shows nothing. Tested at: Sat 01:30 (soon, 02:00), Tue 23:10 (soon, 23:30), Mon 10:00 (closed, 11:00), Sun 01:00 (soon, 02:00), Sun 03:00 (closed, 11:00), Thu 23:30 (soon, 24:00), Sat 17:00 (open, 02:00).
- **`window.bbTrack(name, props)`**: does nothing unless `window.BB_ANALYTICS_URL` is set (it is not); then `navigator.sendBeacon` with `{name, props, t}`, props filtered to `branch`, `provider`, `locale`, `device`. Called for `menu_view`, `menu_search` (once per pause in typing, never the words), `branch_select`, `provider_handoff` (LINE MAN, Grab, phone, maps — a click, not a sale) and `arcade_open`.

## Still open

**Facts only the owner can supply (Pattanakarn):** opening hours; phone number; GrabFood share link from the Grab app (and its QR); facilities; whether it is "Burger Bro & Steak" and "in the gas station" (both taken off the page); postcode/subdistrict for the address. Also for Rama 9: whether the Wongnai hours are current, and holiday exceptions.

**Untested UX hypotheses (brief p. 30) — not built, not measured:**
- *Story length:* the long desktop burger scroll may delay the menu and ordering; compare with a shorter sequence or an earlier menu cue, measuring menu reach and provider hand-off.
- *Short-screen hero:* the large headline and full-height hero may push the main action low on short phones and desktop windows; check representative short viewports. (The new phone action row keeps Order now visible regardless.)

**Other:** before/after performance traces (A09); a real-phone, LINE in-app browser and screen-reader pass; the arcade module itself (`arcade/arcade.js`), whose success path could not be exercised here.

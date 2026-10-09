# Burger Bro — V2 audit register

Baseline: `main` at `a1f3f76` (what is live at https://mpc0367.github.io/burger-bro/). Work: branch `enhance/v2`, 9 October 2026.
Companion files: `preservation-manifest.json` (full inventory), `reconciliation.md` (generated before/after diff), `shots/before` (22 images) and `shots/after` (30 images). File names give the viewport: `d1440` desktop 1440×900, `t1024` and `t768` tablets, `m390`, `m375`, `m320` phones; `-full` is the whole page, `-th-` is Thai, `rm-` is reduced motion, `nojs-` is scripts disabled.

## How this was tested, and what was not

- **Rendering and interaction:** Chromium only. Screenshots come from headless Chrome rendering the page inside a frame of the exact viewport size. Interaction tests ran in the Claude desktop app's built-in browser (Chromium) with emulated viewports, against a local static server at `/burger-bro/` (same base path as GitHub Pages).
- **Not tested:** Safari, Firefox, any physical phone, any screen reader, real touch input, slow-network throttling, Lighthouse, Core Web Vitals (no field data exists for this URL). Those are listed as untested, not as passes.
- **Section screenshots** use the page's built-in `?shot=` capture mode, which turns entrance animations off so before and after are comparable. Motion itself was checked by script (states and positions), not by eye.
- **Restaurant facts** (prices, hours, address, phone, the 4.4★ line, free popcorn, branch 2) were preserved as found. None were independently verified.

## Register

Status: **Confirmed** = reproduced in the browser or read directly from source. **Measured** = number attached. **Enhancement** = improvement, nothing was broken. **Not reproduced** = the report did not match the source. Priority: P1 substantial, P2 refinement, P3 optional.

| ID | Status / priority | Element | Reproduction and observation | Customer impact | Patch | Acceptance test and result |
|---|---|---|---|---|---|---|
| BB-01 | Confirmed, P1 | Hero "Order delivery", bro "Order the signature", footer "Order on foodpanda" | All three linked to `foodpanda.co.th/restaurant/xad4/burger-bro-rama-9`. foodpanda Thailand shut down on 23 May 2025 (Khaosod English, Time Out Bangkok, Inside Retail; foodpanda's own pages put up a bot check, so the official notice was not loaded here). On 10 October 2026 the owner said the shop is on Grab and LINE MAN. LINE MAN: the Wongnai listing "BURGER BRO (เบอร์เกอร์โบร !) พระราม 9" shows 443 Rama 9 Soi 49 and 082-793-8855, matching this site, and its order page loads the shop's menu. GrabFood: Grab's own Rama 9 article lists the shop with the same phone number, but no public shop link could be found (Grab's web search redirects to its marketing page). | The main action on the page led to a dead service. | Footer primary button → "Order on LINE MAN" (`wongnai.com/delivery/businesses/156615HR/order`), with Call and Walk-in kept beside it as before. Hero "Order delivery" and bro "Order the signature" keep their original wording and now jump to that order section. GrabFood is named in one line of text without a link until the shop's Grab share link is supplied. foodpanda was not restored. | `a[href*=foodpanda]` count 3 → 0; LINE MAN link, `tel:` and maps link read back from the footer; hero and bro buttons land on `#order`. Pass. |
| BB-02 | Observed strength | Palette, type, hero | Beige / dark brown / red, Anton headline, burger hero confirmed at five viewports. | — | Preserved. Colours and fonts untouched. | Before/after fold screenshots match apart from the action label and hours line. |
| BB-03 | Enhancement, P2 | `#bro` five-stage section | Pinned scroll of 430vh on wide screens; static list at ≤900px and under reduced motion. No way to skip; step numerals were plain text. | Menu and prices sit behind a long scroll. | "Skip to the menu" link in the section head. While pinned, the numerals become real buttons that scroll to that stage; current stage gets `aria-current`, a marker bar and a progress line. Static modes keep plain numerals. Animation frames now load when the section is near, not at page load. | Skip lands with "THE MENU" 228px from the top, clear of the header. Step 4 button → stage 04, progress 0.700. All five stages present in every mode (reconciliation). At 390px: 0 buttons, all five visible. Pass. |
| BB-04 | Enhancement, P2 | Menu | Static list of 27 rows in 5 groups plus value sets; no in-menu navigation. | Long scroll to reach drinks or sets. | Sticky section rail built from the real group headings (anchor links, active cue, sideways scroll with a fade cue on phones). Every row with a real photo gets a "Photo" button. | Each rail link lands its heading at 134–144px, below the rail (54px). Deep link `…/#menu-drinks` and browser Back both restore position. Menu rows identical before/after (27/27). Pass. |
| BB-04b | Measured, P1 | Menu on phones | At 390×844 the row nearest mid-screen opened a 212px photo panel by itself. Scrolling through the burgers changed the menu's height between 4029px and 4253px (224px jumps). | Text moves under the thumb while reading. | Auto-open removed. The mid-screen row keeps its tint only. Photos open from the Photo button. | Same scroll after the change: height constant (4059px), 0 panels open. Pass. |
| BB-05 | Passed | Language switch | EN → TH → EN compared across 15 sampled strings and labels. | — | Preserved. Added: a 140ms dip instead of a hard swap, reading position held (3px drift measured), rapid clicks settle on the last choice. | Round trip returns the identical English state; three rapid clicks end in a consistent state. Pass. |
| BB-06 | Not reproduced | `<html lang>` | Source at `a1f3f76` has `<html lang="en">` and the switch updates it. | — | Residual gap closed: a saved Thai preference now sets `lang="th"` before first paint. | `lang` follows the switch in both directions. Pass. |
| BB-07 | Enhancement, P3 | Receipt | Fixed illustration; arithmetic correct (300.00 + 21.00 = 321.00). | Could be read as a live bill. | Caption under it: "Illustrative order — not a live basket". Receipt rows unchanged. | Receipt rows identical before/after. Pass. |
| BB-08 | Needs owner input | Maps link | Search-query URL, works, not an exact place link. | — | Unchanged. | — |
| BB-09 | Confirmed, P2 | Structured data hours | JSON-LD said Mon–Thu close 23:59. The visible table says Tuesday closes 23:30. | Search engines were given hours that contradict the page. | JSON-LD rewritten to match the table (Tuesday 23:30, Fri–Sat 02:00 next day). Hours are still written in six places; all six are listed in the manifest. | JSON parses; three specifications match the five table rows. Pass. |
| BB-10 | Confirmed, P3 | Hero hours line | Rendered as "OPEN DAILY 11:00 —" with the dash hanging at the line end. | Reads as unfinished. | "OPEN DAILY FROM 11:00" (and the Thai equivalent). Times unchanged. | Screenshot. Pass. |
| BB-11 | Measured | Page weight | See "Page weight" below. | First paint waited on a 6.28MB document. | Photos and frames moved to files; below-fold images lazy; responsive sizes. | See table. |
| BB-13 | Confirmed, P2 | Marquee | One copy of the text animated by −50%: the band emptied on the right, then jumped. No way to pause it. | Visible glitch; moving text with no stop control. | Text repeated to fill the band and loop cleanly (one pass per 30s); pause/play button. | 6 copies at 1440px; pause sets `animation-play-state: paused`. Pass. |
| BB-14 | Confirmed, P1 | Mobile navigation | With the sheet open the page behind stayed focusable, focus stayed on the button, and the button still said "Open menu". | Keyboard and screen-reader users could tab into hidden content. | Page behind goes `inert`, focus moves into the sheet and back, label switches to "Close menu", Escape closes, sheet closes if the screen widens. | Open → inert true, focus inside; Escape → closed, focus back on the button; link → closed, lands on the section. Pass. |
| BB-15 | Measured, P2 | 320px screens | Page was 333px wide in a 320px viewport. Causes: the receipt's unbreakable dashed rules set the footer column width; brand + language + menu button did not fit the header. | Content clipped at the right edge. | Footer grid items allowed to shrink (rules clip inside the receipt as designed); tighter header below 350px. | Scroll width equals viewport at 320, 340, 360, 375, 390, 430, 768, 1024, 1366, 1440, 1920 (EN) and 320, 390, 768, 1440 (TH). Pass. |
| BB-16 | Confirmed from source, P2 | Loader | The red loader was in the HTML and only script removed it. Minimum 750ms, ceiling 2600ms, replayed on every load. | If the script failed, the page stayed covered. | Loader shows only once script is known to run, clears itself by CSS after 3.2s regardless, minimum 500ms, ceiling 2000ms, skipped on repeat views in the same tab. | With scripts disabled the page renders fully (`shots/after/nojs-*`). First view: loader gone and scroll unlocked within 1.7s. Repeat view: no loader. The CSS-only failsafe was not separately exercised. Pass. |
| BB-17 | Measured, P2 | Touch targets | Language button 61×30, footer social links 174×20. | Hard to hit. | Language 69×44, social links 174×44. New controls: rail link 52px tall, Photo button hit area ≈51px tall, skip link 44px. | Measured at 390px. Pass (44px is a project target, not the WCAG minimum). |
| BB-18 | Measured, P3 | Small-text contrast | Inactive language label at 38% opacity ≈ 2.3:1 against the page. | Hard to read. | Raised to 62% ≈ 4.7:1; currency glyph raised from 55% to 72%. | By calculation from the page colours. |
| BB-19 | Confirmed, P3 | Markup | Hero caption was a `<figcaption>` outside its `<figure>`; image `width`/`height` attributes said 1920 on 1440px files; header could slide away while it held keyboard focus; no description, social preview or favicon (`/favicon.ico` returned 404). | Minor. | All corrected. Favicon is the existing badge. Indexing and canonical settings were not touched. | No console errors, 0 failed requests and 0 broken images across a full scroll (57 requests) in the final build. Pass. |
| BB-12 | Coverage limit | — | See "not tested" above. | — | — | Untested, not passed. |

## Page weight

Same-origin bytes, cold cache. "Over the wire" for the live baseline was measured with `curl` against GitHub Pages. "After" figures are file sizes from the local build; the gzip figure for the new HTML is computed locally and will only be real once deployed. Fonts are unchanged and not counted.

| | Before | After |
|---|---|---|
| HTML document | 8,419,825 bytes (6,280,714 gzip, measured live) | 129,591 bytes (33,767 gzip, computed) |
| Needed before anything renders | the whole 6.28MB | HTML + one hero photo (129KB at 960w) |
| Phone, 390×844 at 2x, scrolled top to bottom | 8.42MB, 1 request | 3.95MB, 57 requests (HTML, 7 photos at 960w, 49 frames) |
| Animation frames (2.72MB) | always downloaded | fetched when the section is about half a screen away (0 frame requests at load, 49 after scrolling); skipped for data-saver visitors (coded, not exercised) |
| A menu photo | already inside the document | 54–86KB, fetched when its Photo button is first used |

Local `DOMContentLoaded` went from 406ms to 28ms on the same machine with no network delay. That is indicative only.

## Motion

One system, existing easing curves. Buttons keep their letterpress move with hover at 160ms and press at 90ms. Rail indicator 220ms. Photo panel 300ms. Language dip 140ms. Nothing new animates on every scroll frame except the existing burger scrub and its progress line. Under reduced motion every one of these is immediate (checked with Chrome's forced reduced-motion mode, `shots/after/rm-*`). The page is also coded to reload if the setting changes mid-visit; that path could not be exercised here.

## Owner verification list

1. **GrabFood share link** for the Rama 9 branch (Grab app → the shop → Share). Until then Grab is mentioned in text only. Also confirm the LINE MAN link opens the right shop on your phone.
2. Whether phone orders are actually taken on 082-793-8855 (the button says "Call", not "Order by phone"), and whether delivery hours differ from dining hours.
3. Menu prices, the before-7%-VAT note, and what 80/90 and 40/55 mean.
4. Opening hours, including Tuesday 23:30 and Fri–Sat 02:00, and the "per our Wongnai listing" note.
5. The "4.4★ Tripadvisor" and "฿101–250 a head" lines in the hero.
6. Free popcorn, and "Delivery to your door" in the footer paragraph (kept as written although no delivery link exists).
7. Exact Google Maps place link for the Rama 9 branch; branch 2 details.
8. That each menu photo shows the named item (Burger Bro, Big Bro, Cheese Burger, Love 'Em Wagyu, Curly Fries, Rib Eye).
9. The "Concept redesign" disclaimer stays until you say the content is approved.
10. Whether this GitHub Pages URL is the public launch or a review draft (decides canonical and indexing, both left alone).
11. Thai wording of the new utility labels (rail, Photo, skip link, delivery note, receipt caption).

## Deliberately not done

- No Open-now badge, cart, checkout, search, filters, gallery, lightbox, analytics, or mobile action bar. Nothing in the content justified them.
- Hero order on phones left as headline → photo → product → actions, as the brief specifies; the first action sits just below the first screen at 390×844.
- Hours, phone and map link are still written in several places in the HTML rather than generated from one data source. That would need script-rendered content or a build step. Every location is listed in the manifest instead.
- Thai translations of the remaining English-only `aria-label`s (amenities list, value sets, sketch map).

## Changed files

`index.html` (modified). New: `media/` (12 photos, 49 frames, 24 resized copies, favicon), `audit/`, `README.md`. No new dependencies, no build step.

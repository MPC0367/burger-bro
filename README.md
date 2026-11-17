# Burger Bro! — website

Static site for Burger Bro (Rama 9, Bangkok). One `index.html` with inline CSS and vanilla JavaScript, photos in `media/`. No build step, no libraries.

Live: https://mpc0367.github.io/burger-bro/ (GitHub Pages, `main` branch, repository root).

## Layout

| Path | What it is |
|---|---|
| `index.html` | The whole page: markup, styles, Thai dictionary, script |
| `media/*.jpg` | Site photos (hero, burger section, shop) and 22 official menu photos from the shop's LINE MAN listings, each with a `-640` / `-960` resized copy |
| `media/replaced/` | Four original menu photos that the official shots replaced. Kept for reference; nothing links to them. |
| `media/seq/f00.jpg … f48.jpg` | 49 frames for the burger breakdown animation |
| `media/favicon.svg` | The nav badge as a favicon |
| `audit/` | Findings, inventory, before/after reconciliation and screenshots from the V2 pass |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. Keep it. |

All asset paths are relative (`media/…`, never `/media/…`), so the site works under `/burger-bro/` and would also work at a domain root.

## Preview locally

From the folder that contains `burger-bro/`:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173/burger-bro/`. Serving the parent folder keeps the same `/burger-bro/` base path as GitHub Pages.

## Deploy

Anything pushed to `main` is live about a minute later. Work on a branch, check it locally, then merge to `main`.

## Editing content

- **English text** is in the HTML. **Thai text** is in the `window.BB_TH` object near the bottom, matched by each element's `data-i18n` key. Menu item names stay in English in both languages.
- **Prices** are plain text in the menu rows. The receipt at the bottom is a fixed illustration and does not read from the menu.
- **Opening hours appear in six places.** Change all of them together: the hours table, `hero.meta1`, `nav.meta`, `mq.1`, `break.meta`, and the JSON-LD block in `<head>`.
- **Phone** (`tel:+66827938855`, shown as 082-793-8855) appears in Find us and the footer.

## Delivery links

foodpanda Thailand closed in May 2025 and is not linked.

- **Delivery follows the branch.** The footer has a branch switch (Rama 9 | Pattanakarn) that is the same choice as the map tabs: choosing a branch in either place sets the LINE MAN button to that branch's own shop page (`data-lineman` on each map tab; the shop's own short links of Nov 2026, resolved) and "Walk in" to its Google listing. The Call button shows only for a branch whose number is on its tab (`data-tel`; Rama 9 today). foodpanda is not offered: it stopped operating in Thailand. Robinhood was removed on 17 Nov 2026: its listings could not be confirmed. GrabFood has no restaurant web pages in Thailand any more; a per-branch link has to be a share link copied from the Grab app.
- **GrabFood:** follows the branch like LINE MAN (`data-grab` on each map tab). Rama 9 opens the shop's own GrabFood page through its share link from the Grab app (`https://app.grab.com/s/olrOpBCF`, merchant `3-C4M1A7CXNBAJJ6`). A branch without `data-grab` (Pattanakarn, until its share link is supplied) opens Grab's general page and shows the "search Burger Bro" note. GrabFood has no restaurant web pages in Thailand: a link must be copied from the Grab app (shop page → Share).
- The hero "Order delivery" and the "Order the signature" button both jump to the footer order section (`#order`), where the two provider buttons are.

## Photos

Each photo exists at three widths. If you replace `media/name.jpg`, regenerate `name-640.jpg` and `name-960.jpg` from it and keep the file names. A menu row with a `data-img` attribute shows its photo on hover with a mouse or trackpad on any window wider than 900px (decided as the pointer moves, so a window resized after loading, a touch laptop and Reduce Motion all get it; under Reduce Motion the photo sits by the pointer without the glide and tilt), when it scrolls to mid-screen (phones), as a thumbnail on wide screens that cannot hover (tablets), and through a Photo button that only appears on keyboard focus. Add `data-img` only when the picture really is that item.

## Map

Find us shows both branches on one map in the site's own colours (paper ground, white streets, expressways in mustard with ink edges, pins styled like the buttons): **Rama 9** and **Pattanakarn** (1348 Phatthanakan Rd). The tabs above it, or a pin, choose a branch: the map moves to it, "Open in Google Maps" and "Directions" under it follow, and so do the delivery buttons in the footer. The Srinakarin branch closed permanently and was removed on 17 Nov 2026.

- **The visitor's location:** when the map or the order buttons come into view the browser asks for the visitor's location (at once if it was allowed before). If allowed, a "You" dot is drawn, each tab shows its distance, and the nearest branch is chosen unless the visitor has already picked one; "Nearest to me" on the map asks again. If refused or unavailable the page stays on Rama 9. The position is used in the page only and sent nowhere.

- **How it is drawn:** MapLibre GL 5.24.0 from cdnjs (with integrity hashes) on OpenFreeMap's free OpenStreetMap tiles (`tiles.openfreemap.org/styles/positron`, recoloured in `mapPaint` in the script; no key, no account, no cookies). It loads only as the visitor nears Find us. Street names follow the page language.
- **Fallback:** if the library, the tiles or WebGL fail, Google's map of the chosen branch takes the frame (each tab's `data-embed`); visitors without JavaScript get Google's map of Rama 9.
- **Branch data** is on each tab: `data-lat`/`data-lng` (from each branch's Google listing), `data-open`, `data-dir`, `data-embed`. Rama 9 opens `https://maps.google.com/?cid=4340520789969302256`, Pattanakarn `?cid=12405364053160930417`.
- The hand-drawn sketch map that Find us had until 10 Nov 2026 is in git history.

## QA helpers built into the page

- `?lang=th` opens in Thai without saving the choice.
- `?shot=full` renders a static full-length page for screenshots; `?shot=%23menu` jumps a static render to a section.

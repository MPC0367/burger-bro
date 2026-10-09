# Burger Bro! — website

Static site for Burger Bro (Rama 9, Bangkok). One `index.html` with inline CSS and vanilla JavaScript, photos in `media/`. No build step, no libraries.

Live: https://mpc0367.github.io/burger-bro/ (GitHub Pages, `main` branch, repository root).

## Layout

| Path | What it is |
|---|---|
| `index.html` | The whole page: markup, styles, Thai dictionary, script |
| `media/*.jpg` | 12 original photos (1440px wide) and their `-640` / `-960` resized copies |
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

- **LINE MAN:** the button with `data-i18n="order.lm"` opens the shop's Wongnai × LINE MAN order page.
- **GrabFood:** the button with `data-i18n="order.grab"` currently opens Grab's general GrabFood page (`https://www.grab.com/th/food/`), not the shop. When you have the shop's share link from the Grab app, replace that `href` and delete the `order.note` line and its Thai entry in `BB_TH`.
- The hero "Order delivery" and the "Order the signature" button both jump to the footer order section (`#order`), where the two provider buttons are.

## Photos

Each photo exists at three widths. If you replace `media/name.jpg`, regenerate `name-640.jpg` and `name-960.jpg` from it and keep the file names. A menu row with a `data-img` attribute shows its photo on hover (desktop), when it scrolls to mid-screen (phones), and through a Photo button that only appears on keyboard focus. Add `data-img` only when the picture really is that item.

## QA helpers built into the page

- `?lang=th` opens in Thai without saving the choice.
- `?shot=full` renders a static full-length page for screenshots; `?shot=%23menu` jumps a static render to a section.

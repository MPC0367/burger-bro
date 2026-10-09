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
- **Phone** (`tel:+66827938855`, shown as 082-793-8855) appears in the hero, Find us and the footer.

## Adding a delivery provider

foodpanda Thailand closed in May 2025, so the page currently offers a call button and a walk-in map link instead. When there is a confirmed shop link:

1. Hero: change the red button's `href` to the shop link, add `target="_blank" rel="noopener"`, and set the text to `Order on <provider>`. Update `hero.call` in `BB_TH` (or give it a new key).
2. Footer: add the same link as the first button in `.order-cta`.
3. Delete the `order.note` line and its Thai entry.

## Photos

Each photo exists at three widths. If you replace `media/name.jpg`, regenerate `name-640.jpg` and `name-960.jpg` from it and keep the file names. A menu row shows a Photo button only when it has a `data-img` attribute; add one only when the picture really is that item.

## QA helpers built into the page

- `?lang=th` opens in Thai without saving the choice.
- `?shot=full` renders a static full-length page for screenshots; `?shot=%23menu` jumps a static render to a section.

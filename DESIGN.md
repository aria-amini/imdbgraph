# DESIGN.md

## Visual system (committed world — refinement only)

- **Aesthetic**: brutalist utilitarian. Flat surfaces, hard 1px borders, no
  radius, no shadows (poster image alone carries `shadow-md`).
- **Surfaces**: `--background` light gray page; panels `bg-card` / `bg-card/35`
  with `border-border`. Content lives in a centered `max-w-7xl` column.
- **Type**: sans (Inter) for title/headings, black weight, tight tracking,
  `text-balance`. ALL metadata uses mono (`font-mono`), uppercase,
  `tracking-widest`, `text-[10px]`, color `text-muted-foreground`.
- **Data voice**: one mono micro-size (10px) for every label — never mix
  10/11/xs. Numbers are `tabular-nums`; the show rating is the only large
  number (`text-2xl/3xl font-black`).
- **Color**: grayscale tokens only, except `ratingColor(rating)` — a green-to-
  red hue scale applied to episode cells and the star. Never introduce new
  hues.
- **Spacing**: 4px ladder; section rhythm `py-6`, gutters `px-4 sm:px-6 lg:px-8`.
- **Interaction**: hover scale on episode cells, CSS-only tooltips, focus
  rings with `ring-offset-background`, no motion beyond micro-transition.

## Known deliberate decisions

- Seasons are rows; episodes flow left-to-right, wrap, left-aligned.
- Corner `E<n>` badges on cells; each cell links to its IMDb episode page.
- View toggle lives inside the content card, right-aligned, `border-b` row.
- Header is minimal: poster, title, one meta line (years · genres), one
  rating line (star + value + / 10 + votes) linking to IMDb. No other stats.

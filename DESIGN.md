# DESIGN.md

## Visual system (committed world — refinement only)

- **Aesthetic**: brutalist utilitarian. Flat surfaces, hard 1px borders, no
  radius, no shadows (poster image alone carries `shadow-md`).
- **Surfaces**: `--background` light gray page; panels `bg-card` / `bg-card/35`
  with `border-border`. Content lives in a centered `max-w-7xl` column.
- **Type**: sans (Inter) for title/headings, black weight, tight tracking,
  `text-balance`. ALL metadata uses mono (`font-mono`), uppercase,
  `tracking-widest`, `text-[11px]`, color `text-muted-foreground`.
- **Data voice**: one mono micro-size (11px) for every label — never mix
  10/11/xs. Numbers are `tabular-nums`; the show rating is the only emphasized
  number (`text-base font-black`, inline with the label row).
- **Color**: grayscale tokens only, except `ratingColor(rating)` — a green-to-
  red hue scale applied to episode bars and the star. Never introduce new hues.
- **Spacing**: 4px ladder; section rhythm `py-6`, gutters
  `px-4 sm:px-6 lg:px-8`.
- **Interaction**: hover scale on episode bars, CSS-only tooltips, focus rings
  with `ring-offset-background`, no motion beyond micro-transition.

## Known deliberate decisions

- Seasons are rows; episode bars stay on one line in episode order. Each row
  scrolls horizontally when it exceeds the available width.
- Episode bars share a baseline and scale in height with the rating. Each bar
  displays its exact rating, with `E<n>` beneath it, and links to IMDb.
- View toggle lives inside the content card, right-aligned, `border-b` row.
- Header is minimal: poster, title, one meta line (years · genres), one quiet
  inline rating row (star + value + / 10 + votes) linking to IMDb. No other
  stats, no IMDb button.
- Episode `E<n>` labels duplicate information in each bar's aria-label; bars
  retain the exact rating in their accessible link name.
- Toolbar rows carry a mono hue-scale legend (left) opposite the view toggle:
  gradient sampled from `ratingColor(0…10)`, 1px `border-border` frame, tick
  labels `1 5 10`. Episode bar ink is chosen per bar: white on the dark red end
  of the scale, near-black (`--foreground` light value) elsewhere — bars keep
  the same ink in dark mode because their surface is theme-independent.

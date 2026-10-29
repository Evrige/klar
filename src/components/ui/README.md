# UI building blocks

Use `Button`, `Card`, `Badge`, `PageIntro` `ProgressBar`, `TextInput` and `TextArea` from this directory.
They preserve native HTML attributes, keyboard interaction and form semantics.
`Button` deliberately keeps the native default submit behavior inside forms; use
`type="button"` when an action must not submit. `Card as="section"` keeps document
semantics; `variant="plain"` is for embedded surfaces without a border/background.

Styles use Tailwind v4 utilities. Repeated domain recipes live in `src/styles/`
under `@layer components` and use `@apply`; direct utilities in JSX override them.
Use semantic colors (`bg-panel`, `text-ink`, `text-muted`, `border-line`) so both
themes and the portalled Select stay consistent. Avoid runtime-built utility names;
use complete static classes or a typed lookup. Runtime percentages and popup
coordinates belong in `style`, not dynamically generated Tailwind classes.

Keep CSS only for theme variable values, keyframes and genuinely custom effects.
Do not add another override at the end of the global stylesheet: edit the recipe.
The entry stylesheet only imports the theme and recipe modules. The original
680px and 1100px breakpoints are preserved, not replaced with Tailwind defaults.

# Notes Plontsch Design System

This guide extracts the visual language of the Notes Plontsch Jekyll site so it can be applied to other sites. The style is quiet, text-first, monospace, and diagrammatic: a personal notebook with subtle generated systems, not a marketing page.

## Principles

- Keep the interface sparse, calm, and readable.
- Prefer text, links, simple cards, and canvas-based visuals over decorative illustration.
- Use Catppuccin-inspired colors with the Mocha dark theme as the canonical expression.
- Use Inconsolata everywhere.
- Keep type small and even: headings are text-sized, not display-sized.
- Let accents appear as links, graph nodes, generated-content pages, and small UI states.
- Avoid glow effects, shadows, heavy gradients, oversized rounded surfaces, and ornamental backgrounds.
- Use generated content styling when content is machine-generated so it is visually distinct.

## Core Tokens

Use CSS variables so the theme can travel across implementations.

```css
@import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap');

:root,
:root[data-theme="dark"] {
  color-scheme: dark;
  --theme-base: #1e1e2e;
  --theme-mantle: #181825;
  --theme-surface0: #313244;
  --theme-surface1: #45475a;
  --theme-text: #cdd6f4;
  --theme-heading: #cdd6f4;
  --theme-body-rgb: 166, 173, 200;
  --theme-body-alpha: 0.6;
  --theme-subtext0: #a6adc8;
  --theme-overlay0: #6c7086;
  --theme-link: #b4befe;
  --theme-hover: #cba6f7;
  --theme-generated-base: #1a1825;
  --theme-generated-border: #3a3444;
  --theme-generated: #ddb6f2;
  --theme-generated-hover: #f5c2e7;
  --theme-generated-body-rgb: 221, 182, 242;
  --theme-button-text: #1e1e2e;
  --graph-base: #1e1e2e;
  --graph-chord: rgba(205, 214, 244, 0.07);
  --graph-color-0: #cba6f7;
  --graph-color-1: #a6e3a1;
  --graph-color-2: #fab387;
  --graph-color-3: #89b4fa;
  --graph-color-4: #f38ba8;
  --graph-color-5: #94e2d5;
}

:root[data-theme="light"] {
  color-scheme: light;
  --theme-base: #f7f8fb;
  --theme-mantle: #eef0f6;
  --theme-surface0: #d2d5e0;
  --theme-surface1: #bfc3d3;
  --theme-text: #363a4f;
  --theme-heading: #2b2f43;
  --theme-body-rgb: 54, 58, 79;
  --theme-body-alpha: 0.78;
  --theme-subtext0: #6f7489;
  --theme-overlay0: #9498ab;
  --theme-link: #1f3df2;
  --theme-hover: #5b6dff;
  --theme-generated-base: #f0e9ff;
  --theme-generated-border: #d8c8ff;
  --theme-generated: #8839ef;
  --theme-generated-hover: #6d4aff;
  --theme-generated-body-rgb: 136, 57, 239;
  --theme-button-text: #f7f8fb;
  --graph-base: #f7f8fb;
  --graph-chord: rgba(54, 58, 79, 0.07);
  --graph-color-0: #8839ef;
  --graph-color-1: #40a02b;
  --graph-color-2: #fe640b;
  --graph-color-3: #1e66f5;
  --graph-color-4: #d20f39;
  --graph-color-5: #179299;
}
```

## Accent Palette

For visuals and richer accents, use the Catppuccin Mocha pastels.

```css
--ctp-lavender: #b4befe;
--ctp-blue: #89b4fa;
--ctp-sapphire: #74c7ec;
--ctp-sky: #89dceb;
--ctp-teal: #94e2d5;
--ctp-green: #a6e3a1;
--ctp-yellow: #f9e2af;
--ctp-peach: #fab387;
--ctp-mauve: #cba6f7;
--ctp-pink: #f5c2e7;
--ctp-rosewater: #f5e0dc;
```

Use lavender for standard links, rosewater or mauve for hover states, and mauve/pink for generated or AI-derived content.

## Page Shell

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  overflow-y: scroll;
  text-align: left;
}

body {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Inconsolata', monospace;
  font-size: 16px;
  line-height: 1.6;
  color: var(--theme-text);
  background: var(--theme-base);
  transition: background-color 0.35s ease, color 0.25s ease;
}

main {
  min-height: 70vh;
  margin-bottom: 2rem;
  font-size: 1.1rem;
  line-height: 1.4;
}
```

Keep pages narrow. The default reading width is 800px, while post images, post titles, and header canvases use 80% width inside that column.

## Typography

- Font family: `Inconsolata`, monospace.
- Body copy: `1rem`, weight `500`, line-height `1.4`, color `rgba(var(--theme-body-rgb), var(--theme-body-alpha))`.
- Headings: `1rem`, weight `400`, color `var(--theme-heading)`.
- Muted metadata: `0.9rem`, color `var(--theme-overlay0)`.
- Badges: `0.6em`, uppercase, `0.5px` letter spacing.
- Lists: body-sized items with `29px` line-height and muted markers.
- Strong text uses full body opacity but remains weight `400`.

This style deliberately avoids visual hierarchy through scale. Use spacing, color, and position to create hierarchy instead.

## Links And Navigation

```css
a {
  color: var(--theme-link);
  text-decoration: none;
}

article a,
main a {
  text-decoration: underline;
}

a:hover,
nav a:hover {
  color: var(--theme-hover);
  text-decoration: underline;
}

nav {
  display: flex;
  gap: 1rem;
}

nav a {
  color: rgba(var(--theme-body-rgb), 0.6);
  font-size: 1rem;
  font-weight: 400;
}

nav a.active {
  color: var(--theme-text);
  text-decoration: none;
}

nav a.inactive,
.subtle {
  color: var(--theme-overlay0);
  opacity: 0.7;
  cursor: not-allowed;
}
```

Navigation should feel like text, not controls. Use button styling only for a single clear call to action.

## Cards

Cards are for repeated items such as generated questions, insights, or index collections.

```css
.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

@media (min-width: 720px) {
  .cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

.card {
  min-height: 150px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  color: inherit;
  text-decoration: none;
  background: var(--theme-mantle);
  border: 1px solid var(--theme-surface0);
  border-radius: 8px;
  transition: border-color 0.2s ease;
}

.card:hover {
  border-color: var(--theme-surface1);
  text-decoration: none;
}

.card h3 {
  margin: 0;
  padding-top: 3rem;
  font-size: 1rem;
  font-weight: 400;
  color: var(--theme-text);
}

.card:hover h3 {
  color: var(--theme-hover);
}
```

Cards should be clickable as a whole when they represent a source item. Do not nest cards inside cards.

## Generated Content Treatment

Generated pages use a distinct mauve tone so readers can immediately distinguish them from hand-authored notes.

```css
.generated-page h1,
.generated-page .card h3 {
  color: var(--theme-generated);
}

.generated-page p {
  color: rgba(var(--theme-generated-body-rgb), 0.7);
}

.generated-page .card {
  background: var(--theme-generated-base);
  border-color: var(--theme-generated-border);
}

.generated-page .card:hover h3 {
  color: var(--theme-generated-hover);
}

.generated-page blockquote {
  margin-top: 3rem;
  border-left-color: color-mix(in srgb, var(--theme-generated) 30%, transparent);
}

.generated-page blockquote p {
  color: rgba(var(--theme-generated-body-rgb), 0.7);
}
```

Add a short generated-content disclaimer at the end of generated pages in a blockquote. Keep it one paragraph with no extra line breaks.

## Blocks, Code, Tables, Media

```css
article code,
main code {
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-family: 'Inconsolata', monospace;
  font-size: 0.95em;
  color: var(--theme-text);
  background: var(--theme-surface0);
}

article blockquote,
main blockquote {
  margin: 0 0 1rem 0;
  padding: 1rem 1rem 1rem 1.5rem;
  color: var(--theme-subtext0);
  background: none;
  border-left: 1px solid var(--theme-surface0);
  border-radius: 0;
}

article blockquote p,
main blockquote p,
table,
time,
footer {
  color: var(--theme-overlay0);
}

hr {
  height: 0;
  margin: 2.5rem 0;
  border: none;
  border-top: 1px dotted var(--theme-overlay0);
  opacity: 0.6;
}

article img,
main img,
.interactive-header {
  max-width: 80%;
  margin: 1rem 0;
}

article img,
main img {
  display: block;
  height: auto;
  border-radius: 4px;
}
```

Images and header visuals should not span the full text column unless the surrounding design has been adjusted deliberately.

## Canvas Visuals

Canvas visuals are a core part of the style. They should feel clean, deterministic, and organic.

- Use Canvas JavaScript, not SVG, for animated post visuals.
- Header visual canvas size: `1200 x 638`.
- Header canvas display size: max-width `80%`, aspect-ratio `1200 / 638`, border-radius `4px`.
- Background: `var(--theme-base)` with Mocha fallback `#1e1e2e`.
- Nodes: clean dots, no glow, no shadow.
- Node size: `4px` for post header visuals, `2.5px` for homepage graph.
- Connections: subtle lines at `0.04` to `0.07` opacity for graph-like systems; use up to `0.2` only for deliberate spoke diagrams.
- Movement: sine-based organic breathing, deterministic phases, smoothstep or quartic easing.
- Interactions: subtle hover/tap feedback; avoid abrupt jumps.
- Accessibility: canvas interactions that announce state changes should use a toast with `aria-live="polite"`.

Use this header shell:

```html
<div class="interactive-header">
  <canvas id="post-visual" width="1200" height="638"></canvas>
</div>
```

```css
.interactive-header {
  max-width: 80%;
  margin: 1rem 0;
  line-height: 0;
}

.interactive-header canvas {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0;
  aspect-ratio: 1200 / 638;
  background: var(--theme-base);
  border-radius: 4px;
}
```

## Homepage Graph Pattern

The homepage graph is an interactive circular post graph.

- Canvas height: `300px`.
- Nodes represent posts.
- Nodes are colored by year or theme tokens.
- Ordering states: Timeline, Themes, Alphabetical, Seasonal, Length, Scatter, Density.
- Tap or click advances to the next transition.
- Use smoothstep easing for transitions.
- Show the active state name in a toast.
- Keep global motion slow, with small deterministic breathing per node.

Toast style:

```css
.graph-toast {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 1;
  pointer-events: none;
  white-space: nowrap;
  font-family: 'Inconsolata', monospace;
  font-size: 1rem;
  color: var(--theme-overlay0);
  opacity: 0;
  transition: opacity 0.3s ease;
}
```

## Theme Toggle

Use a small icon-only theme toggle in the footer. Store the selected theme locally. If no theme is stored, follow `prefers-color-scheme`.

```css
.theme-toggle {
  flex: 0 0 auto;
  padding: 0.2rem;
  color: var(--theme-overlay0);
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  line-height: 0;
  transition: color 0.25s ease;
}

.theme-toggle:hover,
.theme-toggle:focus-visible {
  color: var(--theme-text);
}

.theme-toggle:focus-visible {
  outline: 1px solid var(--theme-surface1);
  outline-offset: 3px;
}
```

## Implementation Checklist

- Use `Inconsolata` globally.
- Set the body width to `800px`, centered, with `20px` padding.
- Use `--theme-base` as the page background.
- Keep headings at `1rem`, weight `400`.
- Use lavender links and mauve or rosewater hover states.
- Keep cards restrained: `8px` radius, 1px border, no shadow.
- Use generated-content tokens for AI-generated pages or summaries.
- Keep post visuals canvas-based, 1200 x 638, with clean dots and subtle lines.
- Use no glow effects.
- Use motion that breathes, drifts, or smoothly transitions rather than bouncing or snapping.
- Add `prefers-reduced-motion` handling for interface transitions.

```css
@media (prefers-reduced-motion: reduce) {
  body,
  .theme-toggle {
    transition: none;
  }
}
```

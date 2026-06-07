---
name: Stadium Sentinel
colors:
  surface: '#f9f9ff'
  surface-dim: '#ccdbf7'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d5e3ff'
  on-surface: '#0c1c31'
  on-surface-variant: '#414755'
  inverse-surface: '#223147'
  inverse-on-surface: '#ebf1ff'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#805600'
  on-secondary: '#ffffff'
  secondary-container: '#fdaf00'
  on-secondary-container: '#694600'
  tertiary: '#843ba3'
  on-tertiary: '#ffffff'
  tertiary-container: '#a055be'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#ffddaf'
  secondary-fixed-dim: '#ffba43'
  on-secondary-fixed: '#281800'
  on-secondary-fixed-variant: '#614000'
  tertiary-fixed: '#f8d8ff'
  tertiary-fixed-dim: '#ecb2ff'
  on-tertiary-fixed: '#320047'
  on-tertiary-fixed-variant: '#6c228c'
  background: '#f9f9ff'
  on-background: '#0c1c31'
  surface-variant: '#d5e3ff'
typography:
  display-xl:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 80px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '800'
    lineHeight: 16px
    letterSpacing: 0.08em
  mono-ui:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1120px
  gutter: 24px
  margin-mobile: 20px
  section-gap: 120px
  stack-sm: 8px
  stack-md: 16px
---

## Command Center Surface (`/command`)

The live command center shares the landing page's **light editorial command-file** style: pale grid canvas (`#f9f9ff`), white document panels, navy readable text (`#07111c`), app-blue primary actions (`#2563eb`), and muted priority badges. It is not a dark navy console — it should feel like the same product family as the landing mockup while preserving the operational workflow (status bar, dispatch queue, active incident workspace, response checklist, team assignment, timeline, evidence feed, bottom utility drawer).

The simulated intake demo (`/demo/intake`) may remain on the darker shared ops palette to contrast the connect flow; only `/command` uses the light workbench shell.

## Brand & Style
The design system is a sophisticated blend of **Editorial Minimalism** and **High-Density Utility**. It is designed to feel like a high-stakes command center reimagined as a premium software product. The aesthetic prioritizes clarity and authoritative calm, necessary for managing stadium incidents, while utilizing the "Balsa-esque" language of floating document panels and vibrant annotation.

The target audience consists of stadium operators and security leads who require rapid information synthesis. The visual mood is professional, urgent, yet deeply organized. The use of large, soft shadows creates a clear distinction between the canvas and the functional mockups, making the interface feel layered and physically present. A subtle grain texture is applied to background surfaces to evoke a sense of tactile "paper" quality, contrasting with the sharp, digital precision of the data mockups.

## Colors
The palette is built on a foundation of warm neutrals and high-contrast navy. 

- **Foundation:** The background uses a warm off-white (#F9F8F6) to reduce eye strain and provide a premium "document" feel. Primary surfaces are pure white (#FFFFFF).
- **Core Action:** Operational Blue (#007AFF) is used for primary operational actions and active states.
- **Annotative Accents:** Amber (#FFB000) and Purple (#8E44AD) are reserved for callout notes and highlighting specific incident types. 
- **Typography & Details:** Dark Navy (#0A1A2F) provides the primary weight for text, while Charcoal (#333333) is used for UI borders and secondary metadata to maintain a softer technical look.

## Typography
The system uses **Hanken Grotesk** as the primary typeface for its sharp, contemporary geometry and exceptional readability. To maintain the editorial feel, headlines utilize tight tracking and heavy weights. 

**JetBrains Mono** is introduced for technical data, timestamps, and coordinate values within the mockups to reinforce the sense of a precision instrument. Callout notes use **label-caps** for their headers to create a distinct visual break from the narrative text, ensuring "sticky note" annotations are immediately recognizable as commentary.

## Layout & Spacing
The design system follows a **Fixed-Width Editorial** model. The primary content is centered within a 1120px container to ensure optimal line lengths for reading. 

- **Vertical Rhythm:** A generous 120px gap separates major sections to create a sense of focused storytelling.
- **The "Mockup Overlay" Pattern:** Product mockups are centered, but annotated sticky notes and labels should intentionally break the grid, overlapping the mockup edges by 16-32px to create depth and a "working desk" aesthetic.
- **Mobile Reflow:** On mobile, the 1120px container collapses to 100% width with 20px side margins. Overlapping callouts reflow to sit directly above or below their target UI element rather than floating.

## Elevation & Depth
Depth is the primary differentiator in this design system. It uses a three-tier elevation strategy:

1.  **Level 0 (Canvas):** The warm-gray background with a subtle noise/paper texture.
2.  **Level 1 (Mockup Panels):** White surfaces with a very large, soft, 15% opacity navy shadow (Blur: 60px, Y: 20px). These panels have a thin 1px charcoal border at 10% opacity to define their edges.
3.  **Level 2 (Callouts & Sticky Notes):** Saturated Amber or Purple surfaces. These use a tighter, more aggressive shadow (Blur: 20px, Y: 8px) to appear as if they are physically stuck onto the Level 1 panels.

Backdrop blurs are used sparingly, specifically for global navigation bars or floating toolbars within the mockups.

## Shapes
The shape language is "Soft Professional." A base radius of 4px (`rounded-sm`) is used for technical UI elements like input fields and buttons within mockups. 

Primary document panels and sticky notes use 8px (`rounded-lg`) to feel more approachable and distinct from the high-density data inside them. Interaction elements like "pill" tags use a fully rounded radius to denote status or categories.

## Components
- **Sticky Callouts:** These are the most distinctive component. They feature a `label-caps` header followed by compact `body-md` text. They are colored either #FFB000 or #8E44AD.
- **Compact UI Mockups:** These are high-density components. Use 1px charcoal dividers, monospaced data points, and micro-interactions (like small status dots). They should not look like generic dashboards but rather specific, functional tools (e.g., a "Zone Assignment" list or a "CCTV Feed Grid").
- **Primary Buttons:** Solid Navy (#0A1A2F) with white text, using `rounded-sm` corners.
- **Ghost Tags:** Used within mockups for status. Light gray background with navy text, using `mono-ui` typography.
- **Document Headers:** Feature a large emoji or icon followed by a bold Hanken Grotesk title, mimicking the Balsa/Notion document structure.
- **Annotated Lines:** Thin, dashed charcoal lines connecting a sticky note to a specific point within a UI mockup.
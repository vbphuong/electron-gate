---
name: Electron Gate
description: High-precision boutique electronics e-commerce and neural RAG intelligence enclave in a High-Key Precision Studio aesthetic
colors:
  primary: "#f05023"
  primary-hover: "#d94114"
  accent-amber: "#ea580c"
  terminal-cyan: "#0284c7"
  terminal-green: "#16a34a"
  restricted-red: "#dc2626"
  enclave-violet: "#6366f1"
  paper-canvas: "#f8f7f4"
  paper-sub: "#f0eee8"
  paper-card: "#ffffff"
  paper-hover: "#eae7e0"
  paper-terminal: "#edeae4"
  ink: "#121417"
  ink-muted: "#4b5563"
  ink-dim: "#7d8795"
  rule: "rgba(18, 20, 23, 0.08)"
  rule-active: "rgba(240, 80, 35, 0.60)"
typography:
  display:
    fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif"
    fontSize: "clamp(2.75rem, 5.5vw + 1rem, 4.25rem)"
    fontWeight: 900
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif"
    fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif"
    fontSize: "clamp(1.25rem, 1.5vw + 0.5rem, 1.45rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-jetbrains-mono), JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  xs: "3px"
  sm: "5px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "10px 20px"
  button-terminal:
    backgroundColor: "#141720"
    textColor: "{colors.terminal-cyan}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "10px 20px"
  card-plate:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "34px"
  input-field:
    backgroundColor: "{colors.paper-sub}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "11px 14px"
---

# Design System: Electron Gate

## Overview

**Creative North Star: "The High-Key Precision Studio"**

Electron Gate's visual language unites the tactile warmth and disciplined typography of an architectural drafting atelier with the dense, cryptographic precision of a high-performance vector terminal. It rejects the generic clichés of modern software design—no bubbly cards, no floating purple-to-blue gradients, no soft shadows, and no decorative italic serifs. Instead, every interface surface feels machined, deliberate, and structurally honest.

The aesthetic operates on crisp bone-paper and architectural chalk grounds (`#f8f7f4`), layered with crisp white container card plates (`#ffffff`), razor-sharp carbon drafting rules (`rgba(18, 20, 23, 0.08)`), and high-energy Electric Industrial Safety Orange (`#f05023`) accents. Content density is calibrated for dual-mode ergonomics: spacious, high-contrast presentation for premium hardware discovery and high-density, low-latency monospace telemetry for warehouse and vector corpus governance.

**Key Characteristics:**
- **Atelier × Terminal Fusion:** Sculptural Fraunces display typography paired with crisp Geist Sans prose and JetBrains Mono computational telemetry.
- **Architectural Drafting Substrate:** Fine 1px hairline rules (`rgba(18, 20, 23, 0.08)`) and subtle grid alignments instead of blurry drop shadows.
- **Electric Industrial Safety Orange Accents:** Saturated Electric Orange (`#f05023`) as the commanding interactive trigger, paired with precision terminal telemetry dyes (Cyan, Emerald, Amber, Crimson).
- **Physical Material Honesty:** Crisp architectural corners (3px to 8px), tactile card elevations, and decisive button presses.

## Colors

The palette is built around architectural paper grounds, carbon inks, and high-energy safety orange accents, punctuated by purposeful terminal telemetry status lights.

### Primary
- **Electric Industrial Safety Orange** (`#f05023`): The commanding brand signifier and primary interactive trigger. Used for primary CTA buttons, active checkout confirmations, brand stamps, and selected navigation states. Its rarity is deliberate; it commands immediate visual focus.

### Secondary
- **Safety Vermilion / Amber** (`#ea580c`): Secondary hardware glow, telemetry warning state, and active press triggers.
- **Vector Phosphor Cyan** (`#0284c7`): Represents vector search, cosine similarity metrics, HTTP POST methods, and RAG query states.
- **Telemetry Nominal Green** (`#16a34a`): Nominal stock badges, healthy worker status rings, and verified citation markers.

### Tertiary
- **Security Enclave Crimson** (`#dc2626`): 403 access restrictions, critical stock shortage alerts, destructive actions, and authentication errors.
- **Neural Context Violet** (`#6366f1`): Document embedding bounds, cluster partitions, and user role markers.

### Neutral
- **Architectural Bone Paper** (`#f8f7f4`): Base background canvas for all viewport roots and foundation planes.
- **Recessed Drafting Plate** (`#f0eee8`): Secondary plates, table headers, and structural wells.
- **Elevated White Card Plate** (`#ffffff`): Elevated container cards, product plates, and interactive modals.
- **Tactile Hover Plate** (`#eae7e0`): Interactive hover layers and table row highlights.
- **Recessed Technical Ground** (`#edeae4`): Recessed inputs, search fields, and image placeholder wells.
- **Deep Carbon Ink** (`#121417`): Primary ink for headings, high-contrast labels, and active typography.
- **Drafting Steel Gray** (`#4b5563`): Secondary body prose, descriptive copy, and inactive navigation links.
- **Annotation Slate Gray** (`#7d8795`): Tertiary metadata, table header captions, and command prompt prefixes.
- **Drafting Hairline Rule** (`rgba(18, 20, 23, 0.08)`): 1px structural dividing lines and container borders.
- **Safety Orange Register Mark** (`rgba(240, 80, 35, 0.60)`): Active border focus states and highlighted grid intersections.

### Named Rules
**The One Signal Voice Rule.** Electric Industrial Safety Orange (`#f05023`) is restricted to ≤10% of any viewport. It acts as the decisive trigger for high-intent actions.
**The Hairline Boundary Rule.** Never separate surfaces using blurry diffuse drop shadows alone. Always define boundaries with 1px drafting hairline rules (`--color-rule`).

## Typography

**Display Font:** Fraunces (Google Fonts, `variable: --font-fraunces`) with fallback to Georgia, serif.
**Body Font:** Geist Sans (Google Fonts, `variable: --font-geist-sans`) with fallback to system-ui, sans-serif.
**Label/Mono Font:** JetBrains Mono (Google Fonts, `variable: --font-jetbrains-mono`) with fallback to monospace.

**Character:** The 2+1 typographic discipline pairs the monumental, Roman-cut editorial authority of Fraunces with the neutral, hyper-legible precision of Geist Sans and the tabular engineering clarity of JetBrains Mono.

### Hierarchy
- **Display** (Weight 900, `clamp(2.75rem, 5.5vw + 1rem, 4.25rem)`, Line-height 1.04, Tracking `-0.04em`): Hero headlines and monumental entrance titles. Always un-italicized (`font-style: normal`).
- **Headline** (Weight 800, `clamp(1.75rem, 3vw + 0.5rem, 2.5rem)`, Line-height 1.15, Tracking `-0.03em`): Section headings and major feature titles.
- **Title** (Weight 700, `clamp(1.25rem, 1.5vw + 0.5rem, 1.45rem)`, Line-height 1.25, Tracking `-0.02em`): Plate headers, product card titles, and modal headers.
- **Lead** (Weight 400, `clamp(1.0625rem, 1vw + 0.5rem, 1.1875rem)`, Line-height 1.62, Measure `58ch`): Introductory paragraphs and hero subheadings.
- **Body** (Weight 400, `0.9375rem` [15px], Line-height 1.65, Measure `62ch`): General prose, product descriptions, and form helper text.
- **Label / Outlier** (Weight 600/700, `0.75rem` [12px], Tracking `0.04em`, Tabular figures): Terminal prompts (`❯`), vector coordinates, JSON streams, stock counts, and uppercase tags (`0.6875rem` [11px], Tracking `0.1em`).

### Named Rules
**The Strict Roman Headings Rule.** Display headings in Fraunces must never use italic styling (`font-style: italic` is strictly banned). They must present monumental, architectural solidity.
**The Monospace Figure Rule.** All numerical quantities, inventory counts, timestamps, prices, and vector similarity scores must render in JetBrains Mono with `tabular-nums` enabled.

## Layout

The spatial model relies on strict CSS grid structures, asymmetric technical bento plates, and architectural drafting alignments.

- **Max Container Width:** 1240px for standard storefront and marketing sections, with 24px horizontal padding (16px on mobile).
- **Split Hero Layout:** 1fr to 1.12fr asymmetric split pairing editorial prose on the left with a live terminal interactive workbench on the right.
- **Bento Architectural Plates:** Asymmetric 1.35fr to 1fr grid with 22px gaps for feature matrices, vector endpoint indexes, and technical schematics.
- **Responsive Breakpoints:**
  - `1024px`: Single-column stacked layouts for hero and bento plates; 2-column stats grids.
  - `640px`: Full-width mobile navigation drawers, vertically stacked CTA button groups, and condensed 1-column telemetry cards.
- **Spacing Rhythm:** Based on an 8px architectural cadence (`4px`, `8px`, `16px`, `24px`, `32px`, `48px`, `80px`).

## Elevation & Depth

Electron Gate eschews soft, diffuse, floating box-shadows in favor of crisp tonal layering, recessed consoles, and hairline boundary cuts. Depth is communicated structurally through luminance stepping and inset tactile borders.

### Shadow Vocabulary
- **Recessed Terminal Depth** (`box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.05)`): Applied to floating terminal consoles and code workbenches to anchor them into the drafting plane.
- **Tactile Stamp Shadow** (`box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5)`): Applied to logo marks, hardware badges, and inset icon wells.
- **Brass Button Press** (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`): Gives primary buttons an authentic physical stamped-metal feel.

### Named Rules
**The Flat Drafting Plane Rule.** Surfaces rest flat by default without ambient drop shadows. Elevation is expressed by stepping from Obsidian Canvas (`#0e1015`) to Drafting Slate (`#141720`) to Archival Plate (`#1b1f2b`).

## Shapes

Geometry is defined by crisp, machined architectural radii and precise geometric alignment.

- **Micro Corner** (`3px` / `--radius-xs`): Buttons, input fields, terminal pills, status tags, and action triggers.
- **Control Corner** (`5px` / `--radius-sm`): Small badges, compact dropdowns, and chip containers.
- **Plate Corner** (`8px` / `--radius-md`): Dashboard cards, bento plates, terminal shells, and auth containers.
- **Modal Corner** (`12px` / `--radius-lg`): Floating dialogs and full-screen drawer overlays.
- **Pill** (`9999px` / `--radius-pill`): User avatar badges and discrete status markers only.

## Components

### Buttons
- **Shape:** Crisp architectural radius (3px).
- **Primary:** Workshop Brass background (`#d4a373`), Obsidian text (`#0e1015`), uppercase JetBrains Mono, 10px 20px padding, 1px top highlight border (`#e5b98c`).
- **Hover / Focus:** Lifts slightly (`transform: translateY(-1px)`), shifts to `#deb081` with brass focus ring.
- **Secondary:** Drafting Slate background (`#141720`), Parchment text (`#f5f4ef`), 1px hairline rule border; on hover shifts to `#1b1f2b` with brass border highlight.
- **Terminal:** Recessed black background (`#090b0f`), Phosphor Green text (`#10b981`), 1px green border (`rgba(16, 185, 129, 0.3)`).

### Chips & Status Tags
- **Style:** Compact monospace label with 2px 7px padding, 3px radius.
- **State:** Role-specific tinting (Admin = Crimson, Staff = Green, User = Violet, POST = Cyan, GET = Green).

### Cards / Containers
- **Corner Style:** 8px radius (`--radius-md`).
- **Background:** Elevated Drafting Slate (`#141720`) or Archival Plate (`#1b1f2b`).
- **Border:** 1px hairline rule (`rgba(245, 244, 239, 0.09)`), transitioning to brass register highlight on hover (`rgba(212, 163, 115, 0.45)`).
- **Internal Padding:** 32px to 34px for major plates; 18px to 20px for telemetry cards.

### Inputs / Fields
- **Style:** Recessed Console Black (`#090b0f`), 1px hairline border, 3px radius, 11px 14px padding, JetBrains Mono 13px text.
- **Focus:** 1px solid Workshop Brass border and subtle brass ring glow (`box-shadow: 0 0 0 1px var(--color-atelier-brass)`).
- **Placeholder:** Blueprint Reference Slate (`#5d647a`).

### Navigation
- **Header Nav:** Fixed 64px height with 90% Obsidian slate and 14px backdrop blur, bottom hairline rule. Monospace uppercase links prefixed with `/` symbol.
- **Dashboard Command Nav:** Sticky 68px header with live user role tags and quick-action icon wells.

### Terminal RAG Workbench (Signature Component)
- **Structure:** Multi-tab role console (Admin / Staff / User) with live green status phosphor, command input prompt (`❯`), vector chunk breakdown cards with cosine similarity score readouts (`0.942 · HNSW`), and 3-column telemetry metric tiles.

## Do's and Don'ts

### Do:
- **Do** format all numerical data, timestamps, prices, and telemetry in JetBrains Mono with tabular figures enabled.
- **Do** maintain crisp, machined 3px to 8px border radii across interactive elements.
- **Do** use 1px hairline rules (`rgba(245, 244, 239, 0.09)`) for layout boundaries and plate borders.
- **Do** reserve Workshop Brass (`#d4a373`) strictly for primary focal points and active state anchors.
- **Do** keep Display Fraunces headings strictly in Roman upright style (`font-style: normal`).

### Don't:
- **Don't** use multi-color gradient text, rainbow button borders, or purple-to-blue SaaS marketing glows.
- **Don't** use soft, pillowy, bubbly border radii (e.g. 24px+ on standard cards or buttons).
- **Don't** use italic serif typography on headings or display text.
- **Don't** float cards with blurry drop shadows without structural border hairline rules.
- **Don't** mix more than 3 distinct accent colors in a single view.

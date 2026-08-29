# Design System — Electron Gate (Atelier × Terminal RAG Enclave)

A locked design system for Electron Gate. Built following the **Atelier Craftsmanship & Monospace Terminal Paradigm** with the **2+1 Typography Discipline** and **Interactive RAG Workbench + Asymmetrical Technical Plates**.

Every page redesign reads this file before emitting code.

---

## Genre & Tone
- **Genre**: `editorial` / `modern-minimal` hybrid (Tactile Atelier Workshop meets Monospace Terminal Intelligence)
- **Tone**: `austere`, `technical`, `artisanal`, `authoritative`
- **Domain**: Retrieval-Augmented Generation (RAG), Vector Corpus Enclaves, Neural Search & Context Pipelines

---

## 2+1 Typography Discipline (Canon · High-Oomph Atelier Edition)

| Role | Font Family | Source | Weight Range | Role & Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | **Fraunces** | Google Fonts | `600 / 700 / 800 / 900` | Wordmark, Monumental Hero Headings, Plate Titles, Architectural Labels (`font-style: normal` always) |
| **Body** | **Geist Sans** | Google Fonts | `400 / 500 / 600` | Lead paragraphs, documentation copy, control labels, UI text (`max-width: 62ch`, line-height `1.62`) |
| **Outlier / Terminal** | **JetBrains Mono** | Google Fonts | `500 / 600 / 700` | Terminal prompts (`❯`), vector coordinates, JSON streams, top-k similarity metrics, tabular figures |

### High-Impact Typographic Step Scale (Double Strata Harmonic Scale)
- `--text-display`: `clamp(2.75rem, 5.5vw + 1rem, 4.25rem)` (tight line-height `1.04`, tracking `-0.04em`, weight `800/900`)
- `--text-h2`: `clamp(1.75rem, 3vw + 0.5rem, 2.5rem)` (line-height `1.15`, tracking `-0.03em`, weight `800`)
- `--text-h3`: `clamp(1.25rem, 1.5vw + 0.5rem, 1.45rem)` (line-height `1.25`, tracking `-0.02em`, weight `700`)
- `--text-lead`: `clamp(1.0625rem, 1vw + 0.5rem, 1.1875rem)` (17px - 19px) (line-height `1.6`, measure `58ch`)
- `--text-body`: `0.9375rem` (15px) (line-height `1.65`, measure `62ch`)
- `--text-sm`: `0.8125rem` (13px) (line-height `1.5`)
- `--text-xs`: `0.75rem` (12px) (tracking `0.04em`, tabular figures)
- `--text-2xs`: `0.6875rem` (11px) (uppercase drafting tags, tracking `0.1em`, weight `700`)

---

## Core Atelier & Terminal Theme Tokens

```css
:root {
  /* Canvas & Workshop Paper */
  --color-paper:          #0e1015; /* Obsidian linen slate */
  --color-paper-sub:      #141720; /* Elevated drafting surface */
  --color-paper-card:     #1b1f2b; /* Archival plate surface */
  --color-paper-hover:    #232838; /* Interactive hover layer */
  --color-paper-terminal: #0a0c10; /* Recessed terminal console */

  /* Inks & Calligraphy */
  --color-ink:            #f5f4ef; /* Raw warm parchment */
  --color-ink-muted:      #9ea3b5; /* Drafting pencil silver */
  --color-ink-dim:        #5d647a; /* Blueprint reference ink */

  /* Structural Drafting Rules & Register Marks */
  --color-rule:           rgba(245, 244, 239, 0.09);
  --color-rule-subtle:    rgba(245, 244, 239, 0.04);
  --color-rule-active:    rgba(212, 163, 115, 0.45); /* Brass alignment */

  /* Atelier & Terminal Accents */
  --color-atelier-brass:  #d4a373; /* Workshop brass & edition seals */
  --color-atelier-amber:  #e09f3e; /* Filament glow / CRT amber */
  --color-terminal-green: #10b981; /* Phosphor nominal status */
  --color-terminal-cyan:  #38bdf8; /* Vector embedding / cosine similarity */
  --color-restricted-red: #ef4444; /* 403 enclave restriction */
  --color-enclave-violet: #818cf8; /* Neural context boundary */
}
```

---

## Macrostructure Family
- **Marketing (`/`)**: 05 · Workshop Split (Editorial Atelier Manifesto + Interactive Vector RAG Workbench) + 01 · Technical Plates Bento Grid (Dense/Sparse Retrieval, Embedding Pipelines, Quantization Matrices, Client Route Enclaves).
- **Auth (`/login`, `/signup`)**: Terminal Gate console with drafting register marks, command prompts (`❯ auth.enclave --grant`), and security validation rings.
- **App (`/dashboard`)**: RAG Intelligence Command Station with role-segregated workstations (Admin Corpus Governance, Staff Document Pipeline Queue, User Retrieval Console).
- **Enclave Guard (`ProtectedRoute`)**: Architectural 403 security plate with cryptographic scope verification.


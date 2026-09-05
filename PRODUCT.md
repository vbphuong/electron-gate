# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **High-End Electronics Enthusiasts & Customers (`User`)**: Shoppers seeking artisanal hardware (mechanical keyboards, audio equipment, ergonomic peripherals, modular components). They need deep technical specs, CLIP-powered visual search to identify parts from photos, and AI-grounded consultation with verifiable citations before purchasing.
- **Warehouse & Fulfillment Operations Staff (`Staff`)**: Logistics operators managing multi-facility physical stock, executing inventory transfer ledgers, monitoring TTL checkout stock reservations, and fulfilling dispatch/shipment workflows.
- **Platform Administrators (`Admin`)**: Operations leads governing catalog definitions, dynamic spec schemas, multimodal document ingestion pipelines (PDF/table/diagram parsing into vector embeddings), RBAC, geographic zones, and 3PL carriers.

## Product Purpose

Electron Gate unites boutique, high-precision electronics e-commerce with industrial multi-facility warehouse inventory operations and an enterprise RAG knowledge enclave powered by hybrid dense/sparse vector retrieval.

## Positioning

A unified technical commerce and intelligence platform combining fine artisanal hardware commerce with deep AI vector intelligence (512d CLIP visual search + multimodal document RAG with verifiable provenance citations) and distributed multi-facility inventory tracking with TTL-driven checkout reservations.

## Operating Context

- **Public & Customer Storefront**: Responsive dark Atelier/Terminal interface for catalog browsing, multi-attribute variant selection (model, color, switches/storage), dynamic spec comparisons, persistent carts, and multi-step checkout with address book support.
- **AI Knowledge & Visual Search Enclave**: Interactive multimodal query interface supporting image-based nearest-neighbor similarity search and document RAG chat grounded in ingested PDFs, manuals, and technical schematics.
- **Staff & Admin Operations Consoles**: High-density operational dashboards for 5-subsystem inventory tracking (locations, stock availability, audit movement ledgers, TTL checkout reservations, replenishment monitoring) and corpus pipeline management.

## Capabilities and Constraints

- **Relational Data Foundation**: 23 ACID-compliant tables in PostgreSQL with UUID primary keys and strict schema validation via Pydantic v2 and SQLAlchemy 2.0.
- **Vector & Full-Text Search**: Native PostgreSQL `pgvector` with HNSW indexes for 512-dim CLIP image embeddings and 1536-dim OpenAI document embeddings; combined with English `tsvector` full-text search, Reciprocal Rank Fusion (RRF), and Maximal Marginal Relevance (MMR).
- **Asynchronous Processing**: Celery + Redis master-worker architecture for distributed document ingestion (`unstructured` single-pass parsing of text, tables, and diagrams) and embedding generation.
- **Access Control & Security**: JWT Bearer Token authentication with role-based access control (RBAC) across `User`, `Staff`, and `Admin` tiers.
- **Inventory Concurrency**: TTL-driven stock reservation mechanics during checkout to prevent overselling across distributed warehouse locations.

## Brand Commitments

- **Name**: Electron Gate (⚡)
- **Voice & Tone**: Austere, technical, authoritative, and artisanal — bridging tactile craftsmanship workshop aesthetics with terminal console precision.
- **Visual Identity**: Atelier × Monospace Terminal design system (Fraunces serif display, Geist Sans body, JetBrains Mono terminal/metrics; warm paper/ink dark-mode palette with brass, amber, and phosphor accents).

## Evidence on Hand

- **Technical Architecture Blueprint**: [`PROJECT_SUMMARY.md`](file:///Users/khaimonh/repos/electron-gate/PROJECT_SUMMARY.md) detailing system version 2.2, database schemas, and AI pipeline specifications.
- **User Flow & Route Specification**: [`user_flow.md`](file:///Users/khaimonh/repos/electron-gate/user_flow.md) documenting 17 distinct user journeys, API contracts, and RBAC matrix.
- **Design Tokens & Typography Rules**: [`frontend/design.md`](file:///Users/khaimonh/repos/electron-gate/frontend/design.md) defining the 2+1 typography discipline and Atelier color palette.
- **Codebase Artifacts**: FastAPI backend routers (`backend/api/`) and Next.js 16 App Router frontend (`frontend/src/app/`).

## Product Principles

1. **Tactile Precision & Authenticity**: Hardware specifications, variant options, and inventory statuses reflect real-world mechanical and physical truth without ambiguity.
2. **Grounded Intelligence**: AI-generated responses and visual searches strictly anchor to verified document chunks and similarity metrics; zero fabricated claims or hallucinated citations.
3. **Atomic State Reliability**: Stock reservations, inventory transfer ledgers, and order state machines enforce strict transactional integrity across all warehouse nodes.
4. **Dual-Plane Ergonomics**: Elegant, aesthetic browsing for customers paired with high-density, low-latency, keyboard-friendly command plates for internal operators.

## Accessibility & Inclusion

- WCAG AA contrast compliance across the dark obsidian/parchment token palette.
- Semantic HTML landmarks and accessible focus rings across storefront catalog and admin command plates.
- Accessible form labeling and keyboard navigation support for complex multi-attribute variant selectors and data tables.

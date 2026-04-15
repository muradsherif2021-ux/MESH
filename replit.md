# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a production-ready ERP architecture document for a Saudi Customs Clearance business.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Wouter routing

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### ERP Phase 2 — Running Application (`artifacts/erp-phase2`) + API Server (`artifacts/api-server`)
- **ERP Frontend**: React + Vite, PORT=21556, full Arabic RTL UI with dark/light mode
- **API Server**: Express 5 + Drizzle ORM, PORT=8080
- **Auth**: JWT sessions, RBAC with roles/permissions
- **Phase 2 modules**: Users, Roles, Branches, Settings, Sequences, Customers, Agents, Treasuries, Bank Accounts, Charge Types, Accounts, Fiscal Years, Audit Logs
- **Phase 3 modules (Pooled Cost Source Engine)**: Agent Trip Charges (ATC-), Agent Additional Fees (AEF-), Customs Payments (CPA-), On-Behalf Costs (OBC-), Cost Sources
  - IFRS 15 Agent Model: All pass-through costs debit account 1104 (On-Behalf Recoverable)
  - Agent credit charges → DR 1104 / CR 2102 (Agent Payables)
  - Cash/bank payments → DR 1104 / CR 1101 (Cash) or 1102 (Bank)
  - Each posted document creates a cost_sources entry for Phase 4 allocation
- **DB schema files**: `lib/db/src/schema/` — platform.ts, accounting.ts, masterdata.ts, operations.ts (Phase 3)
- **Posting service**: `artifacts/api-server/src/lib/posting.ts`
- **Admin login**: admin / Admin@12345

### ERP Phase 1 — Saudi Customs Clearance Architecture (`artifacts/erp-phase1`)
- **Type**: React Vite web app
- **Preview path**: `/`
- **Purpose**: Interactive Phase 1 ERP architecture document for a Saudi customs clearance company
- **Features**:
  - Full Arabic RTL-first UI
  - Dark/Light mode
  - 10 sections covering: Architecture, Domain Model, Database ERD, Chart of Accounts, Posting Rules, Invoice Lifecycle, API Outline, Risks & Decisions, Roadmap

### Data files (in `artifacts/erp-phase1/src/data/`):
- `architecture.ts` — 8 bounded contexts, domain entities with invariants
- `chartOfAccounts.ts` — Full 3-level Arabic CoA (IFRS/ZATCA compliant)
- `postingRules.ts` — 10 business events with DR/CR/timing/validations
- `database.ts` — 20+ database tables with fields, constraints, indexes
- `apiOutline.ts` — 70+ API endpoints across 8 modules
- `roadmap.ts` — 5-phase roadmap, 6 design decisions, 5 risk analyses

## ERP Business Model
- Saudi customs clearance company acting as AGENT (not principal)
- IFRS 15 agent model — pass-through costs are NOT revenue
- Double-entry accounting engine
- VAT only on company's own service revenue (not pass-through amounts)
- Pooled cost sources allocated at invoice time (not immediately)
- Draft/Final invoice lifecycle with posting lock

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

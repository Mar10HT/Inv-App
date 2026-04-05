# Inv-App Frontend Documentation

This directory contains comprehensive architectural documentation for the Inv-App frontend.

## Documents

### [CODEMAPS.md](./CODEMAPS.md)
**Complete architectural reference for the entire frontend codebase.**

- Project structure and directory organization
- Feature architecture (Loans, Transfers, Inventory, etc.)
- Core patterns (Dialog architecture, Filtering, Pagination)
- Data models and interfaces
- Service architecture
- i18n and styling systems
- Performance considerations
- Development commands

**Read this first** to understand:
- Where files are located
- How features are organized
- What each service does
- Database models and API endpoints

### [RECENT-PATTERNS.md](./RECENT-PATTERNS.md)
**Deep dive into modern patterns introduced in recent development.**

Covers:
1. **Dialog Result Types** — Type-safe dialog outputs
2. **Manual Confirm Receipt/Return UI** — Non-QR confirmation flows
3. **Pagination & Filtering Fix** — How filtering resets page index
4. **finalize() Loading State Pattern** — Tracking batch operation completion
5. **takeUntilDestroyed** — Automatic subscription cleanup
6. **effect() with allowSignalWrites** — Reactive filtering with signals
7. **QR Code Pattern** — Print-scan workflows for loans/transfers

**Read this when**:
- Building new features with similar patterns
- Understanding recent architectural decisions
- Implementing filtering, dialogs, or batch operations
- Learning the canonical examples (Loans, Transfers modules)

## Quick Navigation

**Starting out?**
- Read: [CODEMAPS.md](./CODEMAPS.md) sections 1-2 for structure overview
- Then: [RECENT-PATTERNS.md](./RECENT-PATTERNS.md) section 1 for dialog patterns

**Adding a new module (CRUD)?**
- Check: [CODEMAPS.md](./CODEMAPS.md) section 5-6 for service/component patterns
- Reference: `/context/COMPONENT_GUIDE.md` for styling and structure
- Refer: [RECENT-PATTERNS.md](./RECENT-PATTERNS.md) section 3 for filtering

**Implementing QR scanning?**
- Read: [RECENT-PATTERNS.md](./RECENT-PATTERNS.md) section 7 (QR Code Pattern)
- Example: `src/app/components/loans/loan-qr-dialog.ts`

**Refactoring filters or pagination?**
- Read: [RECENT-PATTERNS.md](./RECENT-PATTERNS.md) section 3 (Pagination & Filtering)
- Example: `src/app/components/loans/loans.ts` applyFilters() method

**Using signals and effects?**
- Read: [RECENT-PATTERNS.md](./RECENT-PATTERNS.md) section 6
- Also check: `/context/COMPONENT_GUIDE.md` "Reactive Patterns" section

## Related Documentation

- **[Component Guide](../context/COMPONENT_GUIDE.md)** — Component structure, styling, templates
- **[Optimizations](../context/OPTIMIZATIONS.md)** — Performance analysis and improvements
- **[Security](../context/SECURITY.md)** — Auth, CSRF, XSS prevention
- **[Changelog](../CHANGELOG.md)** — Version history and feature changes
- **[Roadmap](../context/ROADMAP.md)** — Planned features and improvements

## Key Files by Feature

### Loans Module
- Entry point: `src/app/components/loans/loans.ts`
- Form dialog: `src/app/components/loans/loan-form-dialog.ts`
- QR dialogs: `src/app/components/loans/loan-qr-dialog.ts`
- Service: `src/app/services/loan.service.ts`
- Interface: `src/app/interfaces/loan.interface.ts`

### Transfers Module
- Entry point: `src/app/components/transfers/transfers.ts`
- Form dialog: `src/app/components/transfers/transfer-form-dialog.ts`
- QR dialogs: `src/app/components/transfers/transfer-qr-dialog.ts`
- Service: `src/app/services/transfer-request.service.ts`
- Interface: `src/app/interfaces/transfer-request.interface.ts`

### Design System
- Colors: `src/styles/design-system/colors.css`
- Tokens: `src/styles/design-system/tokens.css`
- Components: `src/styles/design-system/components.css`

### i18n
- English: `src/assets/i18n/en.json`
- Spanish: `src/assets/i18n/es.json`

## Architecture Diagram

```
Frontend (Angular 20 + Signals)
├── Components (Standalone)
│   ├── Main Pages (Loans, Transfers, Inventory, etc.)
│   ├── Dialogs (Form, QR, Confirm)
│   └── Shared (Utilities, Confirm Dialog)
├── Services (Business Logic)
│   ├── LoanService → Loan API
│   ├── TransferService → Transfer API
│   └── Other Services
├── State (Signals)
│   ├── Source signals (service data)
│   ├── Computed signals (derived data)
│   └── Effects (reactive updates)
└── Styles (Tailwind + Design Tokens)
    └── CSS Variables (Dark/Light theme)
         ↓
Backend API (NestJS + Prisma)
└── RESTful endpoints with JWT auth
```

## Development Checklist

When working on a feature:
- [ ] Read CODEMAPS.md for structure overview
- [ ] Check RECENT-PATTERNS.md for relevant patterns
- [ ] Review `/context/COMPONENT_GUIDE.md` for component templates
- [ ] Look at canonical examples (Loans, Transfers)
- [ ] Update translations (en.json + es.json)
- [ ] Test in both Dark and Light themes
- [ ] Verify responsive design (mobile + desktop)
- [ ] Update CHANGELOG.md if architectural changes

## Updating Documentation

**When to update CODEMAPS.md:**
- Major architectural changes
- New features with novel patterns
- Service structure changes
- New directories or modules

**When to update RECENT-PATTERNS.md:**
- New canonical patterns emerge
- Pattern variations or gotchas discovered
- Examples need clarification

**When to update Component Guide:**
- New styling rules discovered
- Reusable component patterns
- Common solutions to problems

**Always update CHANGELOG.md:**
- Every feature or architectural change
- Breaking changes
- Significant bug fixes

---

**Last Updated:** 2026-04-03

For questions about a specific component or pattern, check the corresponding source file — it contains JSDoc comments and inline examples.

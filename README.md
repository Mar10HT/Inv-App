<div align="center">

<img src="brand/variants/icon-primary.svg" alt="Obsid" width="80" />

<h1>Obsid</h1>

**Modern inventory management for growing businesses.**

[![Angular](https://img.shields.io/badge/Angular-20-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

[Documentation](./context/COMPONENT_GUIDE.md) · [Roadmap](./context/ROADMAP.md) · [Changelog](./CHANGELOG.md) · [Backend API](https://github.com/mherrerabl/Inv-App-API)

</div>

---

<!-- ![Obsid Dashboard](docs/screenshot.png) -->

Track stock, manage warehouses, handle loans and transfers, generate reports — all from a clean, responsive dashboard with dark/light themes and full i18n support.

## Features

- **Inventory Management** — Full CRUD with advanced filtering, bulk/unique items, Excel import, and low stock alerts
- **Multi-Warehouse** — Transfers with approval workflows, stock reconciliation, and transaction history
- **Loan System** — Warehouse-to-warehouse lending with due dates, automatic overdue detection, and returns
- **Reports & Analytics** — Interactive dashboard with customizable chart widgets, drag-and-drop grid, CSV/PDF export
- **Role-Based Access** — Granular permissions with 5 user roles and route-level protection
- **Internationalization** — English and Spanish with runtime language switching
- **Command Palette** — Quick navigation with Ctrl+K
- **Theming** — Dark and light modes with WCAG AA compliance and design system tokens

## Tech Stack

| | Technology |
|---|---|
| **Framework** | Angular 20 · Standalone Components · Signals |
| **UI** | Tailwind CSS 4 · Angular Material |
| **Charts** | ApexCharts |
| **i18n** | ngx-translate |
| **Auth** | JWT (HttpOnly cookies) · CSRF protection |
| **Testing** | Jest · Playwright |

## Getting Started

**Prerequisites:** Node.js 20+

```bash
npm install
npm start              # → http://localhost:4200
```

Connects to the backend API at `http://localhost:3000/api` by default. See [environment config](./src/environments/) to customize.

```bash
npm run build          # Production build
npm test               # Unit tests
npm run e2e            # E2E tests (Playwright)
```

## Deploy

Deploy to Vercel with zero configuration. See the [deployment guide](./context/VERCEL-DEPLOYMENT.md) for details.

## Documentation

**Core Documentation:**
| | |
|---|---|
| [Architecture Codemaps](./docs/CODEMAPS.md) | Complete codebase structure & module overview |
| [Recent Patterns](./docs/RECENT-PATTERNS.md) | Modern patterns (signals, filtering, dialogs, QR) |
| [Component Guide](./context/COMPONENT_GUIDE.md) | Component structure, styling, templates |

**Supplementary:**
| | |
|---|---|
| [Changelog](./CHANGELOG.md) | Version history |
| [Security](./context/SECURITY.md) | Security implementation |
| [Optimizations](./context/OPTIMIZATIONS.md) | Performance analysis |
| [Roadmap](./context/ROADMAP.md) | Planned features |
| [Deployment](./context/VERCEL-DEPLOYMENT.md) | Vercel deployment |
| [Brand Assets](./brand/GUIDELINES.md) | Logo usage guidelines |

## License

[MIT](./LICENSE) — Mario Herrera

# Duesly

Duesly is a premium, secure levy collection and automated reconciliation platform custom-tailored for trade groups, cooperative societies, markets, and residential estates. 

---

## Key Features

*   **Dedicated Payment Accounts**: Automatic assignment of unique payment coordinates to members (assigned bank accounts for instant bank transfer tracking).
*   **Gated Multi-Tenant Dashboards**:
    *   **Super Admin**: Platform-wide controls, tenant onboarding, and comparative collections reports.
    *   **Organization Admin**: Manage vendor lists, generate levy bills, view compliance rates, and export CSV/PDF reports.
    *   **Member/Vendor Portal**: Instant search lookups, real-time receipt downloads, and simple credential onboarding.
*   **Aesthetic & Responsive Layout**: Styled with custom emerald and deep navy color palettes, modern typography, glassmorphism, and smooth micro-animations.
*   **AI Coach & Collection strategist**: Embedded AI-powered assistant providing automated levy collection optimization tips.
*   **Installable PWA**: Configured with vector logo manifests, icons, and service worker caching for standard mobile installation support.
*   **Graceful Empty States**: Built-in visual placeholders for all charts and reports when no transaction data exists.

---

## Technology Stack

*   **Framework**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (React SSR + Type-safe routing)
*   **Database**: PostgreSQL
*   **Styling**: Tailwind CSS & Modern Custom CSS Variables
*   **Visualization**: Recharts (Responsive Area, Bar, and Pie Charts)
*   **Security**: CSRF request middleware gating, password visibility toggles, and strict session-role restrictions

---

## Getting Started

### 1. Prerequisites
Ensure you have **Node.js** and **PostgreSQL** running locally. Create a `.env` file at the root:
```env
DATABASE_URL=postgres://username:password@localhost:5432/duesly
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Seeding & Setup
Reset and seed the PostgreSQL database schemas with demo organization details and users:
```bash
# Run the clean database reset and seed script
npx tsx scripts/clean-database-reset.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Compilation
```bash
npm run build
```

---

## Demo Login Accounts

*   **Organization Admin (Ariaria Market Association)**:
    *   *Email*: `admin@ariaria.org`
    *   *Password*: `password`
*   **Vendor Portal Lookup Search**:
    *   *Search Term*: `Aisha Bello` or `+234 811 220 0098`

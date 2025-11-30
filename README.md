# SEOEngine.io

SEO on Autopilot - Automated SEO optimization for websites and Shopify stores.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend:** NestJS (Node + TypeScript)
- **Database:** PostgreSQL + Prisma
- **AI:** OpenAI / Gemini
- **E-commerce:** Shopify Admin API

## Project Structure

```
seoengine/
  apps/
    web/        # Next.js 14 frontend
    api/        # NestJS backend API
  packages/
    shared/     # Shared types and utilities
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL (for later phases)

### Install Dependencies

```bash
pnpm install
```

### Run Development Servers

```bash
# Run both frontend and backend concurrently
pnpm dev

# Or run individually:
pnpm dev:web    # Frontend only (http://localhost:3000)
pnpm dev:api    # Backend only (http://localhost:3001)
```

### Build

```bash
pnpm build
```

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Architecture](./ARCHITECTURE.md)
- [API Specification](./API_SPEC.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Roadmap](./ROADMAP.md)
- [Brand Guide](./BRAND_GUIDE.md)
- [Shopify Integration](./SHOPIFY_INTEGRATION.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## Production Deployment

Production deployment uses the following stack:

- **Database:** Neon (managed PostgreSQL)
- **API:** Render (NestJS backend)
- **Web:** Vercel (Next.js frontend)
- **DNS/SSL:** Cloudflare
- **Backups:** AWS S3 (periodic database backups)
- **E-commerce:** Shopify Partner app

Stripe billing (Phase 10B) is optional and can be configured after initial deployment.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for full production deployment instructions.

# Moriah Box — Frontend

Web application for ordering pre-cooked African meals and ingredient boxes with recipes, delivered by partner drivers.

## Overview

Moriah Box serves two audiences:

- **Customers** — Singles and families looking for pre-cooked meals or prepared African food ingredients with step-by-step recipes.
- **Drivers** — Car owners looking for side income by delivering orders within their area.

## Tech Stack

- [Next.js 15](https://nextjs.org/) — App Router, server components
- [TypeScript](https://www.typescriptlang.org/) — strict mode
- [Tailwind CSS](https://tailwindcss.com/) — utility-first styling
- [Supabase](https://supabase.com/) — authentication
- [Stripe](https://stripe.com/) — payment processing

## Features

- Browse meals and ingredient box menu with images and pricing by box size
- Cart with persistent state and multi-size support
- Checkout with delivery area/slot selection and Stripe payment
- EN / FR language support throughout
- Driver application flow
- Admin panel for menu and order management
- Responsive, mobile-first layout

## Project Structure

```
src/
├── app/          # Routes and page-level components (App Router)
├── components/
│   ├── ui/       # Reusable design-system primitives
│   └── marketing/# Landing page sections
├── features/     # Feature-specific logic and components
├── lib/          # API helpers, translations, utilities
└── types/        # Shared TypeScript types
```

## Getting Started

**Prerequisites:** Node.js 20+, pnpm

```bash
pnpm install
cp .env.example .env.local   # fill in your values
pnpm dev                     # starts on http://localhost:3000
```

## Environment Variables

See `.env.example` for the full list. Required values:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` | Session idle timeout in minutes |

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type check |
| `pnpm test` | Run unit tests |

## Backend

The REST API is in the companion repository [`moriahbox/moriahbox`](https://github.com/moriahbox/moriahbox) — Spring Boot 3, Java 21, PostgreSQL.

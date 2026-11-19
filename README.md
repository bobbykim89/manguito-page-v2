# Manguito Page v2

A repository for source code of [Manguito Page](https://manguito-page.bobbykim.dev/) — a photo blog dedicated to Manguito, an adorable peach-faced lovebird, showcasing daily moments and charming antics. Reworked original [Manguito Page](https://github.com/bobbykim89/manguito-page) using Nuxt 4 and TypeScript.

## Requirements

- Node 24 (`nvm use` reads `.nvmrc`)
- pnpm 12, pinned in `package.json` (`corepack enable` picks it up)
- Docker, for the local MongoDB

## Setup

Install the dependencies:

```bash
pnpm install
```

## Local DB

Start the local database with Docker Compose (`restart` recreates the container and wipes its data):

```bash
pnpm db:local:up
pnpm db:local:restart
```

## Dev Server

Start the development server on `http://localhost:3000`:

```bash
# local env (.env.local, local DB)
pnpm dev

# dev env (.env.dev)
pnpm dev:dev

# prod env (.env), real data, use with care
pnpm dev:prod
```

## Quality checks

```bash
pnpm lint          # ESLint
pnpm format        # Prettier (format:check to only check)
pnpm typecheck     # vue-tsc
pnpm test          # Vitest: API tests against an in-memory MongoDB + unit tests
```

CI runs `lint` and `test` on every pull request; both must pass before merging to `master`.

## Production

Build the application for production:

```bash
pnpm build        # prod
pnpm build:dev    # dev env
pnpm build:local  # local env
```

Locally preview the production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Architecture

This project uses a layered architecture:

- **Nitro (H3) backend** — API routes powered by Nitro with Mongoose for MongoDB interactions
- **Pinia data layer** — acts as a wrapper between the Nitro backend and the Vue frontend, managing server state and caching
- **Vue frontend** — component-driven UI built with Nuxt 4's improved app directory structure

## Tech Stack

> Vue
> Nuxt 4
> Nitro (H3)
> MongoDB
> Mongoose
> Pinia
> TailwindCSS
> vueuse
> Bcrypt
> Json Web Token (JWT)
> Manguito Component Library (MCL)
> Docker Compose
> Zod
> Progressive Web App (PWA)

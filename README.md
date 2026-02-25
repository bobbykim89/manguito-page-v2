# Manguito Page v2

A repository for source code of [Manguito Page](https://manguito-page.vercel.app/) — a photo blog dedicated to Manguito, an adorable peach-faced lovebird, showcasing daily moments and charming antics. Reworked original [Manguito Page](https://github.com/bobbykim89/manguito-page) using Nuxt 4 and TypeScript.

## Setup

Install the dependencies:

```bash
# pnpm
pnpm install

# yarn
yarn install
```

## Local DB

Start local database using docker compose (resets existing data on restart):

```bash
# pnpm
pnpm db:local:restart

# yarn
yarn db:local:restart
```

## Dev Server

Start the development server on `http://localhost:3000`:

```bash
# local env
## pnpm
pnpm dev
## yarn
yarn dev

# dev env
## pnpm
pnpm dev:dev
## yarn
yarn dev:dev

# prod env
## pnpm
pnpm dev:prod
## yarn
yarn dev:prod
```

## Production

Build the application for production:

```bash
# prod build
## pnpm
pnpm build
## yarn
yarn build

# dev build
## pnpm
pnpm build:dev
## yarn
yarn build:dev

# local build
## pnpm
pnpm build:local
## yarn
yarn build:local
```

Locally preview production build:

```bash
# pnpm
pnpm run preview

# yarn
yarn preview
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

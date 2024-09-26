# Manguito Page v2

A repository for source code of [Manguito Page](https://manguito-page.vercel.app/) project. Reworked original [Manguito Page](https://github.com/bobbykim89/manguito-page) using Nuxt 3 and Typescript.

## Setup

Install the dependencies:

```bash
# pnpm
pnpm install

# yarn
yarn install
```

## Local DB

Start local database using docker compose (resets existing data on restart)

```bash
## pnpm
pnpm db:local:restart

## yarn
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
## pnpn
pnpm dev:dev
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

## Tech stack

> Vue
> Nuxt 3
> Nitro (H3)
> MongoDB
> Mongoose
> TailwindCSS
> vueuse
> Bcrypt
> Json Web Token (JWT)
> Manguito Component Library (MCL)
> Docker Compose
> Zod
> Pinia
> Progressive Web App (PWA)

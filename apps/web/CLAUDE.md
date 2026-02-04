# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Protocol

**Be extremely concise.** Minimize tokens while maximizing information density. Sacrifice complete sentences, articles (a/an/the), and grammatical formality for brevity and clarity. Use fragments, bullet points, technical shorthand. Examples:

- ❌ "I will now proceed to build the project using forge build"
- ✅ "Building with `forge build`"
- ❌ "The test has failed because there is a type mismatch error"
- ✅ "Test failed: type mismatch"
- ❌ "I have successfully completed the implementation of the new feature"
- ✅ "Feature implemented"

Apply this throughout responses—explanations, status updates, error descriptions. Every word should earn its token cost.

## Updating This File

After completing **major tasks**, reflect on whether CLAUDE.md should be updated. Only update for:

- **Fundamental architecture changes** (e.g., new core module, storage pattern changes, major refactors)
- **Critical tips/best practices** that future agents should know (e.g., non-obvious gotchas, essential workflows)

Be **conservative**—don't update for routine bug fixes, minor features, or task-specific details. This file should contain timeless, foundational knowledge.

When updating: maintain concise style, add to appropriate section, avoid redundancy.

## Project Overview

This is the **web** app within the `hackmoney` pnpm monorepo. It is a Next.js 16 application using React 19, TypeScript 5.9, Tailwind CSS v4, and shadcn/ui components. The monorepo also contains a Foundry-based smart contracts workspace (`/contracts`) and a shared Node utilities package (`/packages/node`).

## Commands

All commands are run from this directory (`apps/web`), or prefixed from the monorepo root.

```bash
# Development
pnpm dev              # Start Next.js dev server (localhost:3000)

# Build & Production
pnpm build            # Build the Next.js app
pnpm start            # Start production server

# Linting
pnpm lint             # ESLint with next/core-web-vitals and next/typescript rules

# From monorepo root
pnpm dev              # Runs web dev server (via --filter web)
pnpm build            # Builds all packages recursively
```

No test runner is configured yet. When tests are added, expect `pnpm test` to be the command.

## Architecture

- **App Router** (Next.js 13+ convention): All routes live under `app/`. No Pages Router usage.
- **Path alias**: `@/*` maps to the project root (configured in `tsconfig.json`).
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google` in the root layout.
- **Styling**: Tailwind CSS v4 with `@tailwindcss/postcss` plugin. Theme is configured inline in `app/globals.css` using `@theme inline` with CSS custom properties. No separate `tailwind.config.js`.
- **Dark mode**: Via `prefers-color-scheme` media query and CSS variables in `globals.css`.
- **ESLint**: Flat config format (ESLint 9+) in `eslint.config.mjs`.
- **shadcn/ui**: Components live under `components/ui/`. Uses `npx shadcn@latest add <component>` CLI.
- **Web3 stack**: Wagmi v2 + Viem + TanStack Query. SSR-safe via cookie storage (`config/wagmi.ts`). `Web3Provider` in `providers/web3-provider.tsx` wraps app in root layout with `cookieToInitialState`. Server-side on-chain reads use `lib/viem.ts` (separate server-only RPC env vars without `NEXT_PUBLIC_` prefix).

## Monorepo Context

- Package manager: **pnpm** (v10.24+) with workspaces defined in root `pnpm-workspace.yaml`.
- The shared `@hackmoney/node` package is at `packages/node/` and can be imported by the web app.
- Smart contracts in `/contracts` use Foundry (`forge build`, `forge test`).

## Key Conventions

- TypeScript strict mode is enabled.
- Use `next/image` for all images.
- Tailwind utility classes for styling; no CSS modules.
- Environment variables go in `.env.local` (gitignored). See `.env.example` for required vars.
- Client-side RPCs use `NEXT_PUBLIC_RPC_*`; server-side use `RPC_*` (no prefix). Both fall back to public RPCs if unset.

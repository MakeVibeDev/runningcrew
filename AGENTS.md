# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`. App Router pages and layouts stay under `src/app`, with route-aware components colocated by folder. Shared logic belongs in `src/lib` (currently `utils.ts`). Global styles and theme tokens sit in `src/app/globals.css`. Static assets, icons, and Open Graph images go in `public/`. Long-form notes or decision records should be added to `docs/` to keep the root clean.

## Build, Test, and Development Commands
Use `npm install` to pull dependencies. Run `npm run dev` for a Turbopack-powered Next.js dev server with hot reload. `npm run build` compiles the production bundle; run it before pushing significant changes. `npm run start` serves the compiled build locally for smoke checks. `npm run lint` executes the shared ESLint flat config (Next.js core-web-vitals + TypeScript rules) and must pass before opening a PR.

## Coding Style & Naming Conventions
We use TypeScript throughout and target Next.js App Router conventions. Prefer client/server component separation with explicit `"use client"` directives where needed. Write functional React components with PascalCase names and colocate helper functions nearby. Follow Tailwind utility-first styling; declare reusable design tokens in `globals.css` rather than ad hoc values. Keep files in `src/app` kebab-case to align with route segments, and ensure imports are path-relative within `src/` unless a base alias is introduced.

## Testing Guidelines
An automated test runner is not yet wired up. When adding behavior, include component or integration tests (e.g., via `@testing-library/react` + `vitest`) under `src/__tests__` or alongside features as `*.test.tsx`, and document any new scripts in `package.json`. At minimum, validate new pages by running `npm run dev` and confirming the critical user flows you touched. Update this section once a canonical setup lands.

## Commit & Pull Request Guidelines
Commit messages should be brief, present-tense imperatives (e.g., `Add crew listing page`). Group related changes into a single commit; avoid bundling refactors with feature work. For pull requests, provide a concise summary, link relevant issues, and include screenshots or GIFs for UI changes (desktop and mobile states). List manual verification steps and mention any follow-up tasks so reviewers can track outstanding work.

## Environment & Tooling Notes
Target the active LTS release of Node.js (>=18) to match Next 15 support. Configure your editor with ESLint and Tailwind intellisense to catch violations early. Avoid committing generated `.next/` or `node_modules/` artifacts; the existing `.gitignore` already excludes them.

## communication language
한글
# Tafel Rush

Times-tables app for 13-year-olds: the app reads a sum aloud, the player answers out loud, the app reacts. Plus the website tafelrush.nl.

- `apps/mobile`: Expo app for iOS and Android. Read `apps/mobile/AGENTS.md` before touching Expo code.
- `apps/web`: Next.js site on Dokku (landing, challenge links `/d/<code>`, privacy, app-link files).
- `packages/shared`: pure logic used by both (number parsing, smart practice, challenge links). Tested with Vitest.

Rules:
- Pure logic goes in `packages/shared` or `apps/mobile/lib/*.ts` without React Native imports, with a test next to it.
- UI copy is Dutch. Everything else in the repo (code, comments, docs, commits) is English. Slang only from the checked list in `apps/mobile/lib/phrases.ts`, at most one in three lines.
- No accounts, no ads, no backend for player data. Progress stays on the phone. The only data leaving the phone is opt-in Firebase Analytics (off by default, parent consent under 16); keep it that way.
- App builds always run locally: `eas build --local`, never in the EAS cloud.
- Before calling work done: `pnpm typecheck`, `pnpm test`, `pnpm lint`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

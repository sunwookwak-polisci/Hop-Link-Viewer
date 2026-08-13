# Hop-Link Viewer — agent entry

Operational entry for agents working from this Git repository. Product behavior, installation, and identity live in tracked source files, not in this file.

## Start work

1. Read this file.
2. Read `README.md`, `manifest.json`, and `package.json` when product, release, or build behavior is relevant.
3. Inspect `git status --short`, the relevant diff, and recent commits before editing.
4. Read the implementation files in scope before deciding on a change.
5. Preserve unrelated local changes.

## Knowledge ownership

| Kind | Source of truth |
|------|-----------------|
| Implementation behavior | TypeScript, CSS, configuration, and tests |
| Product behavior and installation | `README.md` |
| Plugin identity and release version | `manifest.json` |
| Package version and build commands | `package.json` |
| Obsidian version compatibility | `versions.json` |
| License | `LICENSE` |
| Development and pull requests | `CONTRIBUTING.md` |

Do not copy durable product facts into this file when they belong in the sources above.

## Commands

```bash
npm install     # first-time dependency setup
npm run dev     # esbuild watch mode
npm run lint    # ESLint
npm run build   # type-check and create production main.js
npm run version # sync manifest.json and versions.json after npm version
```

## Repository map

| Path | Role |
|------|------|
| `main.ts` | Plugin entry point, view registration, events, and settings persistence |
| `src/anchor.ts` | Anchor-note resolution |
| `src/graph.ts` | Link graph traversal and candidate filtering |
| `src/view.ts` | Sidebar view and interaction rendering |
| `src/settings-tab.ts` | Obsidian settings UI |
| `src/constants.ts` | Shared plugin constants |
| `styles.css` | Sidebar styles |
| `manifest.json` | Obsidian plugin metadata and release version source of truth |
| `versions.json` | Plugin-version to minimum-Obsidian-version mapping |
| `esbuild.config.mjs` | Bundle configuration for generated `main.js` |
| `version-bump.mjs` | Version metadata synchronization |

Generated `main.js` is build output. Do not edit it by hand or commit it as source.

## Guardrails

- Keep changes narrowly scoped and follow existing TypeScript and Obsidian plugin patterns.
- Use structured APIs rather than ad hoc text manipulation when practical.
- Do not edit `node_modules/` or generated `main.js`.
- Keep `README.md` accurate when user-visible behavior or installation changes.
- Keep `manifest.json`, `package.json`, and `versions.json` synchronized when changing versions.
- Treat `manifest.json`, `README.md`, `LICENSE`, Git configuration, and the GitHub repository as the current identity sources in their respective domains.
- Use only public identity and contact details that the user has explicitly approved for publication.
- Do not change Git identity, remotes, ownership, tags, releases, funding links, or community-listing metadata without explicit user authorization.
- Do not rewrite existing commit or release history unless the user specifically requests it.
- Do not commit, push, tag, publish a release, change remotes, or transfer repositories unless the user explicitly requests it.
- Never add credentials, private contact details, vault content, machine-specific paths, or private notes to tracked files.

## Release artifacts

An Obsidian release ships `main.js`, `manifest.json`, and `styles.css`. The repository must still retain the TypeScript source and build configuration for review and reproducible builds.

## Completion checks

1. Run `npm run lint` and `npm run build` when implementation, styles, or build configuration changes.
2. Run `git diff --check` when Git is initialized.
3. Review the complete scoped diff for unrelated changes, secrets, and stale URLs.
4. Report checks that were not run or did not pass.

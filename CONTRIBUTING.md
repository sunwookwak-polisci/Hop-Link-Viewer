# Contributing to Hop-Link Viewer

Thanks for helping improve Hop-Link Viewer. Bug reports, focused feature proposals, documentation fixes, and pull requests are welcome.

## Before opening an issue

- Check that the issue still occurs in the latest release.
- Search existing issues for the same behavior.
- For bugs, include your Obsidian version, plugin version, platform, reproduction steps, expected behavior, and actual behavior.
- Do not attach private vault content. Replace note names and paths with a minimal anonymized example.

## Development

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Run `npm run dev` while developing.
4. Run `npm run lint` and `npm run build` before submitting a pull request.

Keep changes narrowly scoped. Update `README.md` when a change affects user-visible behavior, settings, installation, or compatibility. Do not edit the generated `main.js` file by hand.

Agent instructions for work from this repository are in [AGENTS-cloud.md](AGENTS-cloud.md).

## Pull requests

Describe the problem, the chosen fix, and how you verified it. Keep unrelated formatting or refactoring out of the same pull request so the behavioral change remains easy to review.

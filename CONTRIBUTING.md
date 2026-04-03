# Contributing to Zeማa

Thanks for contributing to Zeማa.

This project is still evolving quickly, so the main goal is to keep contributions focused, readable, and easy to review.

## Before you start

1. Read [README.md](/home/naol/CascadeProjects/music-platform/README.md)
2. Follow the local setup in [SETUP.md](/home/naol/CascadeProjects/music-platform/SETUP.md)
3. Make sure the app runs locally before changing behavior

## Workflow

1. Start from the latest `main`
2. Create a feature branch
3. Make one focused change at a time
4. Test the change locally
5. Commit with a clear message
6. Open a pull request

Example:

```bash
git checkout main
git pull --rebase
git checkout -b feature/profile-polish
```

## Branch naming

Use short descriptive names such as:

- `feature/mobile-nav`
- `feature/google-auth`
- `fix/release-card-stats`
- `docs/setup-guide`

## Commit messages

Keep commit messages clear and specific.

Good examples:

- `Add mobile navigation menu`
- `Fix release rating hover state`
- `Update setup documentation`

## What to include in a pull request

Try to include:

- what changed
- why it changed
- how you tested it
- screenshots for UI changes when helpful

## Code guidelines

- Prefer small, focused changes over large mixed commits
- Keep naming clear and consistent
- Reuse existing components and utilities when possible
- Avoid committing secrets, local env files, or generated build output
- Preserve the existing visual language unless the change is intentionally a design update

## Testing

At minimum, run the checks that fit your change.

Common commands:

```bash
npm run client:build
npm run server:build
cd server && npm test
```

If you changed database schema or Prisma models, also run:

```bash
npm run db:migrate
```

## Environment and secrets

Do not commit:

- `server/.env`
- `client/.env.local`
- API keys
- OAuth secrets
- database credentials

Use the example env files instead:

- [server/.env.example](/home/naol/CascadeProjects/music-platform/server/.env.example)
- [client/.env.local.example](/home/naol/CascadeProjects/music-platform/client/.env.local.example)

## Issues and ideas

If you are not sure whether something should be changed, open an issue or describe the problem before making a large change.

For early-stage work, smaller and clearer contributions are much easier to merge than big combined refactors.

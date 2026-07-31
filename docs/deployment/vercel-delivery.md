# Vercel delivery contract

Football Life Reborn uses the existing Vercel Git Integration for
`wkyhit/football-life-reborn`. It is the only deployment path. The repository
must not add a Vercel CLI deployment or a GitHub Actions deployment beside it.

## Project settings

The linked project is owned by the `enity` team and builds the repository root
as a static Vite application:

| Setting | Contract |
| --- | --- |
| Root Directory | repository root (no override) |
| Framework | Vite |
| Node.js | 24.x |
| Package manager | `npm@10.9.4` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |

`vercel.json`, `package.json`, and `package-lock.json` are the versioned source
of truth for those build settings. The Vercel dashboard should not override
them with a different command or output directory.

## Git Integration lifecycle

Each TDD slice follows one delivery loop:

1. Run the slice's local test, lint, typecheck, and build gates.
2. Commit the completed slice once on its issue branch.
3. Push that commit to GitHub immediately.
4. Wait for the matching Vercel Preview deployment to become `Ready`.
5. Confirm the Preview source is the exact pushed commit.
6. Verify the slice on its unique Preview URL with `ego-browser`.
7. Record the commit, URL, target, status, build result, and verification in the
   issue timeline before starting the next slice.

The final reviewed pull request is merged to `main`. Vercel then creates the
Production deployment from that accepted `main` commit. No separate promotion
build is allowed.

## Credential boundary

Git Integration owns repository authorization. This project needs no
repository deployment secret, GitHub Actions secret, or Vercel CLI token.
Never commit:

- `.vercel/` local project state;
- `.env` or local environment files;
- Vercel account, team, or project identifiers;
- access tokens or deployment credentials.

Dashboard administration is performed through `ego-browser`. It is reserved
for read-back and the explicit rollback/restore drill; normal Preview and
Production deployments remain automatic Git deployments.

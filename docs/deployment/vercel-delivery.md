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

## Deployment mapping

| Git event | Vercel target | Required source |
| --- | --- | --- |
| Issue branch push | Preview | Exact pushed commit |
| Final pull request head | Preview | Exact PR head commit |
| Accepted `main` merge | Production | Exact merge commit |

The issue branch is pushed after every completed slice so that it remains
playable before the final pull request exists. The pull request is opened only
after all issue slices pass. Opening it must not introduce a second deployment
runner: its evidence points to the Preview for the exact PR head commit.

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

## Required evidence block

Every slice records one issue-timeline block with these fields:

- Commit SHA: `<40-character Git SHA>`
- Git ref: `<issue branch, PR head, or main>`
- Deployment URL: `<unique vercel.app deployment URL>`
- Target: `<Preview or Production>`
- Status: `Ready`
- Framework: `Vite`
- Build duration: `<seconds>`
- Build error scan: `<no errors or the exact blocking error>`
- Browser verification: `<ego-browser task and passed assertions>`

The dashboard deployment card must be unique for that commit and Git ref. Its
source link must match the full pushed SHA, and its unique URL must load the
behavior introduced by that slice.

Do not start the next slice until the deployment is `Ready`, the source SHA and
Git ref match, exactly one deployment card represents that branch push, the
unique Preview passes the slice's `ego-browser` checks, and the evidence comment
has been read back from GitHub.

Stop instead of bypassing Git Integration when a deployment is missing,
duplicated for the same branch SHA, canceled, errored, linked to another commit,
or broken on its unique URL. A CLI deploy, manual rebuild, or second Actions
workflow cannot be used to manufacture passing evidence.

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

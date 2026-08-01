# Vercel Production acceptance

The release boundary is the accepted `main` merge commit created by the
reviewed pull request for the release under verification. Vercel must create
the automatic Git Integration Production deployment from that exact commit.
Do not promote or rebuild an alternate commit to manufacture a passing release.

The public alias is
[`https://football-life-reborn.vercel.app/`](https://football-life-reborn.vercel.app/).
The alias is accepted only after the Vercel dashboard shows one `Ready`
Production deployment for the full merge SHA and `main`, and the alias resolves
to that unique deployment. Mutable results belong in the pull request and issue
timeline rather than this versioned contract.

The latest accepted product release at this revision is
[Issue #25](https://github.com/wkyhit/football-life-reborn/issues/25),
delivered by
[PR #26](https://github.com/wkyhit/football-life-reborn/pull/26). Its exact
commit, unique deployment, browser measurements, and error scans remain in the
[PR Production evidence](https://github.com/wkyhit/football-life-reborn/pull/26#issuecomment-5149241659)
and issue timeline, not duplicated as mutable values in this contract.

## Production evidence block

- Production URL: `https://football-life-reborn.vercel.app/`
- Unique deployment URL: `<immutable vercel.app deployment URL>`
- Target: `Production`
- Status: `Ready`
- Commit SHA: `<accepted 40-character main merge SHA>`
- Git ref: `main`
- Framework: `Vite`
- Build duration: `<seconds>`
- Build error scan: `<no errors or exact blocking error>`
- Browser verification: `<ego-browser task space and passed assertions>`

The evidence also records the verification time, production-alias read-back,
first-party error scan, and the previous known-good Production candidate for
recovery. Run the rollback drill only when the governing release requires it
or when a failed acceptance boundary requires recovery; a passing automatic
Production deployment does not require a manual rollback/restore alias change
after acceptance.

## Clean-context critical journey

Run the release smoke with `ego-browser`; Chrome and Playwright are not release
executors for this contract.

1. Clear local storage and session storage, then open Enhanced and Classic at
   the public Production URL.
2. Directly navigate to a supported direct route, perform a hard reload, and
   require usable SPA HTML rather than a 404.
3. Create a deterministic career, cross one persisted decision boundary,
   reload, resume from local storage, and finish at the expected summary.
4. Open a storage-independent replay hash in a clean context and hard reload
   it without changing the rendered result.
5. Repeat the Preview `career-workbench` regression at 195×415, 390×667,
   568×320, and 1280×830. Require a centered current year, fixed timeline
   chrome, bounded internal scrolling, held selection/result acknowledgement,
   one persisted yearly story, exact-money disclosures, goalkeeper table
   semantics, deliberate follow suspension and return, and Classic
   compatibility.
6. Fetch the manifest and icons; require document revalidation and immutable
   one-year caching for hashed assets.
7. Drain console and network evidence. Fail on an uncaught error, failed
   first-party request, mixed content, or unexpected `/api/` business request.

The smoke also checks no horizontal overflow at mobile and desktop widths, no
failed crest or metadata asset, the accepted JavaScript/CSS budgets, and zero
application-root axe violations on the visited critical surfaces.

Production acceptance stops immediately when the alias is not mapped to the
exact merge SHA, the deployment is not `Ready`, the build/error scan is not
clean, a critical journey differs from Preview, or a cache/origin/runtime
boundary fails. Continue only by restoring the previous known-good deployment
or by shipping a separately reviewed fix through the same Git path.

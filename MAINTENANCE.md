# Library maintenance and remaining migration work

This draft modernizes the root library's build, typecheck, Jest/ESLint and browser verification toolchain. It is not completion of the entire repository migration. The independent `www` website and the historical CI/deployment workflows remain unchanged.

## Verified contracts

- Contributor Node 24 is separate from the published Node >=8 contract. CI checks the CommonJS bundle on Node 8.17, while parser tests enforce ES5 syntax for both UMD distributions. Disabling UglifyJS's new arrow-function conversion fixes a reproduced minified-output regression.
- UMD/CommonJS, ESM, declarations and source maps retain their entry points. Rollup uses native ESM configuration files and TypeScript 5.9. Jest 30 and ts-jest 29.4 use compatible declared peers. TypeScript 7 is outside ts-jest's peer range and the retained ES5 compilation contract.
- All 110 original unit assertions are retained. Deprecated Jest matcher aliases use their current equivalent. Existing screenshot baselines are untouched. Additional CI compares two synthetic fixtures pixel-for-pixel against a separately built, pinned original commit, in both regular and minified output, and runs the existing Karma fixtures in Chrome, Firefox and native Safari.
- Production source changes are formatting, an explicit `void` property read, and a comment retaining the existing Hebrew/Gurmukhi enum collision. Correcting that numeric/rendering behavior requires focused fixtures and is not hidden inside the tooling update.
- The obsolete sourcemaps plugin pulled a Rollup-2-only helper into the Rollup 4 graph. TypeScript and Rollup now produce source maps directly; artifact tests check the original TypeScript sources and embedded source content.

## Dependency findings (2026-10-03)

The refreshed root audit has 55 findings (26 high, 24 moderate, five low), with no critical findings. It previously reported six critical entries. Scoped replacements address these paths:

- `chromeless -> chrome-launcher -> mkdirp/minimist`: launcher 1.2.2 removes the vulnerable launch/argument-parsing chain. The current 0.34 CDP transport preserves the used `goto/evaluate/end` contract; a local synthetic browser smoke check is part of CI.
- `html2canvas-proxy -> request -> form-data`: compatible form-data 2.5.6 preserves multipart length/output behavior and rejects header injection through field/filename data in regression checks.

This is not a clean full audit. Retained Chromeless/AWS SDK 2, the legacy proxy/request stack, native simulator helpers, release tooling and Webpack 4 still require targeted migrations. `braces` GHSA-vfj7-8cjw-p6xm has no published patch; no override claims to fix it. Tests use repository-controlled patterns and synthetic fixtures. No remote Chromeless/AWS service is invoked.

The unchanged `www/package-lock.json` audit reports 206 findings, including 22 critical. Its Gatsby 2/React 16 graph is independently unresolved; a green root verification workflow does not certify it.

## Remaining work and concrete acceptance criteria

1. Refresh compatible patch/minor dependencies in `www` first, using its own lockfile, and establish a reproducible Gatsby 2 baseline. Its current plugin families, native Sharp dependency and historical Node toolchain must be tested together; forced peer resolution is not evidence of compatibility. Preserve source content, routes, rendered markup, styles and generated assets while comparing the baseline.
2. Assess Gatsby 5/React 18 and matching maintained plugins as a complete graph. Replace removed `boundActionCreators`/GraphQL APIs and audit Glamor/typography integration. The Universal Analytics configuration uses an inherited UA identifier; a GA4 migration cannot invent a replacement property ID. A modern site must build and pass offline route/content/visual checks before changing the existing docs pipeline. This can continue in the same draft after baseline evidence is available; it is pending work, not an assertion that migration is impossible.
3. Migrate root preview/release/proxy/reference-generation utilities individually, with local fixtures for each used API. Do not blindly override their transitive majors or execute publishing commands to test them.
4. The historical workflow references retired macOS/Xcode/iOS images and Internet Explorer emulation. Current hosted runners cannot certify those environments. Preserve their configurations until a maintained reproducible runner or an explicit support-policy decision exists. Current Chrome/Firefox/Safari and ES5 syntax checks are additional evidence, not substitutes for those historical results.
5. Once website and utility checks are verified, repair the existing docs/artifact pipeline without changing publisher permissions, tag conditions, credentials or deployment behavior. Until then the original CI may fail and the repository maintenance remains incomplete.

The historical `.github/workflows/ci.yml` and `release.yml` are byte-for-byte unchanged. The added verification workflow has read-only repository permissions, skips install scripts, and performs no release or deployment.

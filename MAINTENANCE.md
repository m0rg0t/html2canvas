# Library maintenance and remaining migration work

This draft modernizes the root library's build, typecheck, Jest/ESLint and browser verification toolchain. It is not completion of the entire repository migration. The `www` dependency graph is refreshed within its compatible Gatsby 2/React 16 families, while its source, content and styling are unchanged. Historical CI/deployment workflows remain unchanged.

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

The refreshed `www` graph reports 157 findings (70 high, 72 moderate, 15 low) and no critical entries, down from 206 findings including 22 critical. Its scope is independently checked and is not a clean audit.

The site keeps Gatsby 2.32.13, updates React to 16.14 and Webpack to 4.47, and now builds its nine pages on normal Node 24. The original Webpack build needed legacy hashing support. Scoped overrides cover Gatsby's development helpers, multipart encoding and repository-URL parsing: React Dev Utils 11.0.4 retains Webpack 4 compatibility, with patched shell-quote, loader-utils and Immer children; git-up uses patched parse-url 8; the GraphQL loader uses patched form-data 4. Common repository-URL fields, Webpack diagnostics, argument quoting and multipart injection protection are tested. Contentful's existing type-fest 2.19 is pinned to make npm's frozen nested resolution reproducible. Root package overrides are mirrored for the local library link.

Website CI builds the immutable original and current graphs, blocks external analytics/ads/fonts requests, and compares nine routes at desktop/mobile widths. It feeds both reftest previewers the same synthetic browser artifacts. Only the displayed bundle-size statistic is normalized because the rebuilt library's byte size legitimately changes. No existing screenshot baseline is replaced. Gatsby telemetry is disabled for installs/builds. These comparisons still need exact-head verification before the website changes can be considered validated.

## Remaining work and concrete acceptance criteria

1. Complete the exact-head frozen install, API regressions, nine-page build and website visual comparison for the refreshed graph. Local frozen installation and synthetic dependency tests pass; no peer-check bypass is used. The two lockfiles remain independent. Website-wide `npm ls` also walks the file-linked library development tree and reports its three scoped override entries, plus three optional native-build residue packages. The library graph is checked in its own root and both frozen installs are checked independently; no claim of a warning-free combined tree is made.
2. Assess Gatsby 5/React 19 and matching maintained plugins as a complete graph. Current gatsby-plugin-glamor 3.11 is deprecated and declares Gatsby 3 / React 16–17 peers, so a latest-major migration requires replacing that styling integration and verifying the result. Replace removed `boundActionCreators`/GraphQL APIs and audit Glamor/typography integration. The Universal Analytics configuration uses an inherited UA identifier; a GA4 migration cannot invent a replacement property ID. A modern site must build and pass offline route/content/visual checks before changing the existing docs pipeline. A major migration can continue in the same draft once a compatible styling replacement preserves the tested output; it remains separate from the verified compatible refresh.
3. Migrate root preview/release/proxy/reference-generation utilities individually, with local fixtures for each used API. Do not blindly override their transitive majors or execute publishing commands to test them.
4. The historical workflow references retired macOS/Xcode/iOS images and Internet Explorer emulation. Current hosted runners cannot certify those environments. Preserve their configurations until a maintained reproducible runner or an explicit support-policy decision exists. Current Chrome/Firefox/Safari and ES5 syntax checks are additional evidence, not substitutes for those historical results.
5. Once website and utility checks are verified, repair the existing docs/artifact pipeline without changing publisher permissions, tag conditions, credentials or deployment behavior. Until then the original CI may fail and the repository maintenance remains incomplete.

The historical `.github/workflows/ci.yml` and `release.yml` are byte-for-byte unchanged. The added verification workflow has read-only repository permissions, skips install scripts, and performs no release or deployment.

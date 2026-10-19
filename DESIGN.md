# Profile header maintenance

The header is generated from the actual sources of [zankevich.com](https://github.com/zankevich/zankevich.com). Do not edit the generated SVG paths.

Keep the site checkout beside this repository, with its dependencies installed, and use Node 24 or newer:

```sh
node generate-headers.mjs
npm run check
```

If the site is elsewhere, set `SITE_SOURCE` to its directory for both commands.

Edit the biography and contact links directly in `README.md`. Edit the header dimensions and positioning in the `layout` object and text styles in `generate-headers.mjs`.

The generator reads these site sources on each run:

- `src/lib/brand/images.ts`: the existing `constructionBody` renderer, exposed only in memory.
- `src/lib/drawing/construction.ts` and `kit.ts`: drawing geometry and stroke weights.
- `src/lib/drawing/engraving.ts`: the original curved engraving lines.
- `src/styles/tokens.css`: light and dark palettes, via the site's palette reader.
- `src/lib/site/constants.ts`: the name and role.
- Fontsource packages: Familjen Grotesk 600 and Schibsted Grotesk 400, as on the site.

The site supplies esbuild and Satori through its installed dependencies. The profile adds no separate dependencies. Satori outlines the original fonts for consistent rendering; text remains editable in the site constants. A change to the site's renderer export may require updating the small in-memory export adapter.

Commit `header-light.svg` and `header-dark.svg` after regeneration. GitHub selects the appropriate image through the README's `picture` element. The biography and links remain native Markdown. Links are authored on one line and may wrap naturally on small screens.

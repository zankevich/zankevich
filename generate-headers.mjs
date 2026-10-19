// Read the drawing, palette, identity and fonts directly from the site checkout.
// Usage: SITE_SOURCE=../zankevich.com node generate-headers.mjs [--check]
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(process.env.SITE_SOURCE || resolve(here, '../zankevich.com'));
const require = createRequire(resolve(site, 'package.json'));
const { build } = await import(pathToFileURL(require.resolve('esbuild')));
const satoriModule = await import(pathToFileURL(require.resolve('satori')));
const satori = satoriModule.default.default || satoriModule.default;
const check = process.argv.includes('--check');

// Expose the site's existing renderer in memory; no site source is modified.
const result = await build({
  stdin: {
    contents: `export { constructionBody } from './images.ts';
      export { PALETTE } from './marks.ts';
      export { engravingLines } from '../drawing/engraving.ts';
      export { SITE } from '../site/constants.ts';`,
    resolveDir: resolve(site, 'src/lib/brand'), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  define: { 'import.meta.url': JSON.stringify(pathToFileURL(resolve(site, 'src/lib/brand/images.ts')).href) },
  plugins: [{
    name: 'site-source',
    setup(builder) {
      builder.onLoad({ filter: /\/brand\/images\.ts$/ }, async ({ path }) => ({
        contents: (await readFile(path, 'utf8')) + '\nexport { constructionBody };',
        loader: 'ts',
      }));
      builder.onResolve({ filter: /\?raw$/ }, ({ path, resolveDir }) => ({
        path: resolve(resolveDir, path.slice(0, -4)), namespace: 'raw-text',
      }));
      builder.onLoad({ filter: /.*/, namespace: 'raw-text' }, async ({ path }) => ({
        contents: await readFile(path, 'utf8'), loader: 'text',
      }));
      // Only constructionBody is used; avoid bundling the unrelated PNG renderer.
      builder.onResolve({ filter: /^@vercel\/og$/ }, () => ({ path: 'unused-og', namespace: 'unused-og' }));
      builder.onLoad({ filter: /.*/, namespace: 'unused-og' }, () => ({
        contents: 'export class ImageResponse {}', loader: 'js',
      }));
    },
  }],
});
const { constructionBody, PALETTE, engravingLines, SITE } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
);
const font = (pkg, file) => readFile(require.resolve(`@fontsource/${pkg}/files/${file}`));
const fonts = [
  { name: 'Familjen Grotesk', data: await font('familjen-grotesk', 'familjen-grotesk-latin-600-normal.woff'), weight: 600 },
  { name: 'Schibsted Grotesk', data: await font('schibsted-grotesk', 'schibsted-grotesk-latin-400-normal.woff'), weight: 400 },
];
const layout = { width: 820, height: 248, drawingX: 548, drawingY: -16, scale: 0.43 };
const h = (type, style, children) => ({ type, props: { style, children } });

for (const theme of ['light', 'dark']) {
  const c = PALETTE[theme];
  const paths = engravingLines({
    gap: 12, extent: { x0: -1600, x1: 1000, y0: -100, y1: 750 },
  }).map(d => `<path d="${d}"/>`).join('');
  const title = await satori(h('div', {
    display: 'flex', width: layout.width, height: layout.height,
    flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 28,
  }, [
    h('div', { backgroundColor: c.background, padding: '4px 10px', color: c.foreground,
      fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 40, letterSpacing: '-1px' }, SITE.name),
    h('div', { backgroundColor: c.background, padding: '4px 10px', marginTop: 8, color: c.muted,
      fontFamily: 'Schibsted Grotesk', fontSize: 19 }, SITE.role),
  ]), { width: layout.width, height: layout.height, fonts });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">
<title>${SITE.name} — ${SITE.role.replaceAll('&', '&amp;')}</title>
<rect width="100%" height="100%" fill="${c.background}"/>
<g transform="translate(${layout.drawingX} ${layout.drawingY}) scale(${layout.scale})">
<g fill="none" stroke="${c.line}" stroke-width="0.8" opacity="0.5">${paths}</g>
${constructionBody(c)}</g>
${title.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
</svg>\n`;
  assert(!/<script|<foreignObject|https?:\/\/(?!www\.w3\.org)/.test(svg));
  if (check) assert.equal(await readFile(resolve(here, `header-${theme}.svg`), 'utf8'), svg, `${theme} header needs regeneration`);
  else await writeFile(resolve(here, `header-${theme}.svg`), svg);
}
const readme = await readFile(resolve(here, 'README.md'), 'utf8');
assert(readme.includes('[LinkedIn](https://www.linkedin.com/in/zankevich) | [X](https://x.com/ArtyomZankevich) | [Website](https://www.zankevich.com/) | [CV (PDF)](https://www.zankevich.com/cv/artyom-zankevich-cv.pdf)'));
assert(readme.includes('prefers-color-scheme: dark') && readme.includes('prefers-color-scheme: light'));
console.log(check ? 'Headers match site sources; README links and theme markup checked.' : 'Generated light and dark SVG headers from site sources.');

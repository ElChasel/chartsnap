import {build} from 'vite';
import {rename,writeFile} from 'node:fs/promises';
// Relative assets allow /chartsnap/ and a local offline HTTP server to use the
// same build. Opt-in Pages analytics uses its own isolated first-party adapter.
process.env.VITE_STATIC_BUILD='true';
await build({configFile:'vite.frontend.config.js',base:'./',build:{outDir:'dist-static'}});
await rename('dist-static/standalone.html','dist-static/index.html');
await writeFile('dist-static/.nojekyll','');
console.log('Static app ready: dist-static/index.html (relative assets; optional consent-based analytics).');

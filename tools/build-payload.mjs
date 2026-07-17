// build-payload.mjs -- assemble the shipped, injected bin/payload.js from the
// source-of-truth modules under src/.
//
//   src/rtl-core.cjs    pure detection core  (module.exports stripped)
//   src/rtl-payload.js  DOM engine template  (has /*__RTL_CORE__*/ + /*__RTL_WIDGET__*/)
//   src/rtl-widget.js   settings-panel fragment
//
// The __FONT_BASE64__ and __RTL_CONFIG__ placeholders are intentionally LEFT in
// the output -- bin/index.js substitutes those at inject time. Run via `npm run
// build`. The generated bin/payload.js is committed so `npx codex-rtl` works
// without a build step.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const corePath = path.join(root, 'src', 'rtl-core.cjs');
const payloadPath = path.join(root, 'src', 'rtl-payload.js');
const widgetPath = path.join(root, 'src', 'rtl-widget.js');
const outPath = path.join(root, 'bin', 'payload.js');

let core = fs.readFileSync(corePath, 'utf8');
const payloadTpl = fs.readFileSync(payloadPath, 'utf8');
const widget = fs.readFileSync(widgetPath, 'utf8');

// Strip the CommonJS export block so the core body can live inside the payload
// IIFE (its function declarations become locals visible to the DOM engine).
const exportMarker = "if (typeof module !== 'undefined' && module.exports) {";
const idx = core.indexOf(exportMarker);
if (idx === -1) {
    console.error('build-payload: could not find the module.exports guard in src/rtl-core.cjs');
    process.exit(1);
}
core = core.slice(0, idx).trimEnd() + '\n';

function inject(tpl, marker, code, label) {
    const lines = tpl.split('\n');
    // Match ONLY a line that IS the marker (alone, ignoring indentation) -- never
    // a comment that merely mentions the marker. Otherwise a doc comment like
    // "replacing the /*__RTL_CORE__*/ marker" would be hit first and the core
    // would be inlined into a comment (undefined helpers -> payload crash).
    const idx = lines.findIndex((l) => l.trim() === marker);
    if (idx === -1) {
        console.error(`build-payload: marker line ${marker} not found in template (must be alone on its line)`);
        process.exit(1);
    }
    const indent = lines[idx].slice(0, lines[idx].indexOf(marker));
    const indented = code.split('\n').map((l) => (l.length ? indent + l : l)).join('\n');
    lines[idx] = `${indent}// >>> inlined ${label} >>>\n${indented}\n${indent}// <<< inlined ${label} <<<`;
    return lines.join('\n');
}

let out = payloadTpl;
out = inject(out, '/*__RTL_CORE__*/', core, 'src/rtl-core.cjs');
out = inject(out, '/*__RTL_WIDGET__*/', widget, 'src/rtl-widget.js');

// NOTE: the header must NOT contain the literal substitution tokens (the font
// and config placeholders). bin/index.js substitutes them at inject time; if the
// tokens also appeared here, a first-match replace would hit the comment and
// leave the real placeholder undefined -- crashing the whole payload.
const header =
    '// GENERATED FILE -- do not edit by hand.\n' +
    '// Built from src/rtl-core.cjs + src/rtl-payload.js + src/rtl-widget.js by\n' +
    '// tools/build-payload.mjs. Run `npm run build` after editing any of those.\n' +
    '// The font/config placeholders are substituted by bin/index.js at inject time.\n\n';

fs.writeFileSync(outPath, header + out, 'utf8');

// Sanity: the two runtime placeholders must survive into the output.
for (const ph of ['__FONT_BASE64__', '__RTL_CONFIG__']) {
    if (!out.includes(ph)) {
        console.error(`build-payload: placeholder ${ph} missing from output -- aborting`);
        process.exit(1);
    }
}

console.log(`build-payload: wrote ${path.relative(root, outPath)} (${(header.length + out.length)} bytes)`);

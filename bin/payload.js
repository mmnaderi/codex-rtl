// GENERATED FILE -- do not edit by hand.
// Built from src/rtl-core.cjs + src/rtl-payload.js + src/rtl-widget.js by
// tools/build-payload.mjs. Run `npm run build` after editing any of those.
// The font/config placeholders are substituted by bin/index.js at inject time.

// rtl-payload.js -- DOM layer for the Codex Smart RTL patch.
//
// TEMPLATE. tools/build-payload.mjs assembles the shipped bin/payload.js by:
//   1. replacing the /*__RTL_CORE__*/ marker with the function bodies of
//      src/rtl-core.cjs (module.exports stripped), and
//   2. leaving the font/config placeholders (declared below) in place --
//      bin/index.js substitutes those at inject time (font bytes + user config).
//      Do NOT write the literal placeholder tokens anywhere else in this file:
//      the substitution must find exactly one occurrence of each.
//
// Everything lives in one IIFE so the detection core, the DOM engine, the
// settings widget, and the config all share a scope. Keep the core marker inside
// this IIFE so its helpers (hasRTL, firstStrong, segmentText, cellDir, ...) are
// visible to the DOM engine below.
;(function () {
    'use strict';
    if (typeof document === 'undefined') return;
    try {
        // --- CONFIG (substituted by bin/index.js) ---
        var fontBase64 = '__FONT_BASE64__';
        var rtlConfig = __RTL_CONFIG__;

        var rtlEnabled = rtlConfig.isRTL !== false;
        var forceRTL = rtlConfig.forceRTL === true;
        var fixAtSign = rtlConfig.fixAtSign !== false;
        var savedFaFont = rtlConfig.faFont || '';
        var savedEnFont = rtlConfig.enFont || '';
        var savedCodeFont = rtlConfig.codeFont || '';
        var savedLH = rtlConfig.lh || '1.6';

        // Codex composes its chat input with Lexical. Never mutate DOM a live
        // editor owns: it reverts foreign mutations inside its subtree, which
        // re-fires our MutationObserver, which mutates again -- an infinite loop
        // that hangs the app (the same class of freeze as Claude's issue #33).
        // Detect the editor by its fundamental nature, not one brittle testid.
        var WRITING_SEL = '[contenteditable="true"], [data-lexical-editor="true"], textarea';
        var EDITOR_SEL = WRITING_SEL + ', [contenteditable=""], [contenteditable="plaintext-only"], [data-lexical-text="true"], .ProseMirror, [role="textbox"]';

        // --- PURE DETECTION CORE (inlined from src/rtl-core.cjs by build-payload.mjs) ---
        // >>> inlined src/rtl-core.cjs >>>
        // rtl-core.js -- pure, DOM-free RTL/LaTeX detection logic.
        //
        // SOURCE OF TRUTH for the detection engine. tools/build-payload.mjs inlines the
        // function bodies of this file into the injected IIFE inside bin/payload.js (it
        // strips the module.exports guard at the bottom). test/rtl-core.test.cjs requires
        // this file directly. Keep this file DOM-free so it stays unit-testable. It is a
        // .cjs file because package.json sets "type":"module" -- the CommonJS export at
        // the bottom is what the test loads and what the build tool strips.
        'use strict';
        
        // Strong-RTL code-point ranges, [lo, hi] inclusive. Covers the modern living
        // RTL scripts plus the common historic/astral ones. Tested against code points
        // (codePointAt), NOT UTF-16 code units, so astral blocks like Adlam work.
        var RTL_RANGES = [
            [0x0590, 0x05FF], // Hebrew
            [0x0600, 0x06FF], // Arabic
            [0x0700, 0x074F], // Syriac
            [0x0750, 0x077F], // Arabic Supplement
            [0x0780, 0x07BF], // Thaana
            [0x07C0, 0x07FF], // NKo
            [0x0800, 0x083F], // Samaritan
            [0x0840, 0x085F], // Mandaic
            [0x0860, 0x086F], // Syriac Supplement
            [0x0870, 0x089F], // Arabic Extended-B
            [0x08A0, 0x08FF], // Arabic Extended-A
            [0xFB1D, 0xFB4F], // Hebrew presentation forms
            [0xFB50, 0xFDFF], // Arabic presentation forms-A
            [0xFE70, 0xFEFF], // Arabic presentation forms-B
            [0x10800, 0x1083F], // Cypriot Syllabary block (incl. early RTL scripts)
            [0x10840, 0x1085F], // Imperial Aramaic
            [0x10A00, 0x10A5F], // Kharoshthi
            [0x10E60, 0x10E7F], // Rumi Numeral Symbols
            [0x1E800, 0x1E8DF], // Mende Kikakui
            [0x1E900, 0x1E95F], // Adlam
            [0x1EE00, 0x1EEFF]  // Arabic Mathematical Alphabetic Symbols
        ];
        
        // cp: a Unicode code point (from String.prototype.codePointAt).
        function isRTL(cp) {
            for (var i = 0; i < RTL_RANGES.length; i++) {
                if (cp >= RTL_RANGES[i][0] && cp <= RTL_RANGES[i][1]) return true;
            }
            return false;
        }
        
        function hasRTL(text) {
            if (!text) return false;
            for (var i = 0; i < text.length;) {
                var cp = text.codePointAt(i);
                if (isRTL(cp)) return true;
                i += cp > 0xFFFF ? 2 : 1;
            }
            return false;
        }
        
        // Direction of the first strong character: 'rtl', 'ltr', or null (no strong char).
        function firstStrong(text) {
            if (!text) return null;
            for (var i = 0; i < text.length;) {
                var cp = text.codePointAt(i);
                if (isRTL(cp)) return 'rtl';
                // ASCII Latin letters are strong-LTR (matches the original /[a-zA-Z]/ rule).
                if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A)) return 'ltr';
                i += cp > 0xFFFF ? 2 : 1;
            }
            return null;
        }
        
        // Remove leading LTR-only noise (filenames, URLs, paths, backtick-code) so a
        // Hebrew/Persian sentence that starts with "foo.js" still detects as RTL.
        function stripLeadingLTR(text) {
            return text
                .replace(/^[\s]*(?:[\w.\-]+\.[\w]{1,5})\s*/g, '')
                .replace(/https?:\/\/\S+/g, '')
                .replace(/[\w.\-]+[\/\\][\w.\-\/\\]+/g, '')
                .replace(/`[^`]+`/g, '');
        }
        
        // A "$...$" body is treated as math only when it carries a real LaTeX signal.
        // This is the currency guard: "$5.99" or "$5 to $10" lack the signal and stay text.
        var LATEX_SIGNAL = /[\\^_{}]|\b(?:frac|sqrt|sum|prod|int|lim|infty|cdot|times|div|leq|geq|neq|approx|partial|nabla|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|matrix|begin|end|left|right|text|mathbb|mathcal|vec|hat|bar|overline|underline)\b/;
        
        function hasLatexSignal(body) {
            return LATEX_SIGNAL.test(body);
        }
        
        // Find math regions as [start, end) index pairs over `text`.
        // Unambiguous delimiters ($$...$$, \[...\], \(...\)) always count; single $...$
        // only counts with a LaTeX signal and only outside already-claimed regions.
        function findLatexRanges(text) {
            var ranges = [];
            if (!text) return ranges;
        
            function claim(re, requireSignal, bodyStart, bodyEnd) {
                var m;
                re.lastIndex = 0;
                while ((m = re.exec(text)) !== null) {
                    var start = m.index;
                    var end = m.index + m[0].length;
                    if (overlaps(start, end)) continue;
                    if (requireSignal) {
                        var body = m[0].slice(bodyStart, m[0].length - bodyEnd);
                        if (!hasLatexSignal(body)) continue;
                    }
                    ranges.push([start, end]);
                }
            }
            function overlaps(s, e) {
                for (var i = 0; i < ranges.length; i++) {
                    if (s < ranges[i][1] && e > ranges[i][0]) return true;
                }
                return false;
            }
        
            // Order matters: claim the unambiguous, greedier delimiters first.
            claim(/\$\$[\s\S]+?\$\$/g, false, 0, 0);
            claim(/\\\[[\s\S]+?\\\]/g, false, 0, 0);
            claim(/\\\([\s\S]+?\\\)/g, false, 0, 0);
            // Single $...$ -- no newline inside, must carry a LaTeX signal (currency guard).
            claim(/\$[^$\n]+?\$/g, true, 1, 1);
        
            ranges.sort(function (a, b) { return a[0] - b[0]; });
            return ranges;
        }
        
        // --- BARE NUMERIC / ARITHMETIC ISOLATION ---
        //
        // Assistants frequently write arithmetic WITHOUT LaTeX delimiters, e.g. a Persian
        // sentence containing "2 + 3 = 5". Inside an RTL paragraph the Unicode bidi
        // algorithm lays the number+operator tokens out right-to-left, so it renders
        // mirrored as "5 = 3 + 2". findMathRanges marks such runs so the DOM can isolate
        // LTR -- the same fix findLatexRanges applies to "$...$", extended to bare math.
        //
        // Operator characters whose PRESENCE proves a run is a genuine expression (not a
        // lone number, date, IP, version, or list marker). ASCII core plus common
        // Unicode math (multiply, divide, minus-sign, <=, >=, !=, ~=, arrow, dots,
        // root). Built with String.fromCharCode so the SOURCE stays pure ASCII. The '-'
        // is escaped so the string is a safe regex class body. Order/codes: U+00D7 U+00F7
        // U+00B1 U+2212 U+2264 U+2265 U+2260 U+2248 U+2192 U+00B7 U+2022 U+2219 U+2217
        // U+22C5 U+221A.
        var MATH_OP_CHARS = '+\\-*/=<>%' + String.fromCharCode(
            0xD7, 0xF7, 0xB1, 0x2212, 0x2264, 0x2265, 0x2260,
            0x2248, 0x2192, 0xB7, 0x2022, 0x2219, 0x2217, 0x22C5, 0x221A);
        var MATH_OP_RE  = new RegExp('[' + MATH_OP_CHARS + ']');
        var MATH_DIGIT_RE = /[0-9]/;
        // A whitespace-delimited token is "mathy" when built only from digits and math
        // punctuation/operators, OR it is a single Latin letter used as a variable
        // (x, y, n). Multi-letter Latin tokens (English words, "3D", "4K") are NOT
        // mathy, so they break a run and keep prose out of the isolated island.
        var MATH_TOKEN_RE = new RegExp('^(?:[0-9.,:;()\\[\\]{}|' + MATH_OP_CHARS + ']+|[A-Za-z])$');
        
        function isMathyToken(tok) {
            return !!tok && MATH_TOKEN_RE.test(tok);
        }
        
        // A token may BOUND a run only if it carries an operand -- a digit or a single
        // Latin variable letter. Pure operator/punctuation tokens ("+", "=", "(") can
        // sit inside a run but never start or end it (avoids dangling "+ 3").
        function isOperandToken(tok) {
            return MATH_DIGIT_RE.test(tok) || /^[A-Za-z]$/.test(tok);
        }
        
        // Find bare numeric/arithmetic runs as [start, end) index pairs over `text`.
        // A run must be whitespace/line delimited, operand-bounded, and contain at least
        // one digit AND one operator. Lone numbers, "$5" currency, RTL-glued
        // constructs (a prefix letter joined to a number with no space), dates/IPs
        // without operators, and "1." list markers are deliberately left alone.
        function findMathRanges(text) {
            var ranges = [];
            if (!text || !MATH_OP_RE.test(text) || !MATH_DIGIT_RE.test(text)) return ranges;
        
            // Scan line by line so a run never spans a newline (each line is its own
            // bidi paragraph). `base` is the absolute offset of the current line.
            var base = 0;
            var lines = text.split('\n');
            for (var li = 0; li < lines.length; li++) {
                scanLine(lines[li], base);
                base += lines[li].length + 1; // +1 for the '\n' removed by split
            }
            return ranges;
        
            function scanLine(line, off) {
                var toks = [];
                var re = /\S+/g; // non-whitespace tokens; \s breaks them
                var m;
                while ((m = re.exec(line)) !== null) {
                    toks.push({ v: m[0], start: m.index, end: m.index + m[0].length });
                }
                var i = 0;
                while (i < toks.length) {
                    if (!isMathyToken(toks[i].v)) { i++; continue; }
                    var j = i;
                    while (j + 1 < toks.length && isMathyToken(toks[j + 1].v)) j++;
                    // toks[i..j] is a maximal mathy group. Trim non-operand tokens off
                    // both ends so the isolated run is operand-bounded.
                    var a = i, b = j;
                    while (a <= b && !isOperandToken(toks[a].v)) a++;
                    while (b >= a && !isOperandToken(toks[b].v)) b--;
                    if (a <= b) {
                        var s = off + toks[a].start;
                        var e = off + toks[b].end;
                        // Drop sentence punctuation that clung to the ends (never part of
                        // a real number at a boundary: a decimal never ends in '.').
                        while (e > s && '.,:;'.indexOf(text.charAt(e - 1)) !== -1) e--;
                        while (e > s && ',:;'.indexOf(text.charAt(s)) !== -1) s++;
                        var sub = text.slice(s, e);
                        if (e - s >= 2 && MATH_DIGIT_RE.test(sub) && MATH_OP_RE.test(sub)) {
                            ranges.push([s, e]);
                        }
                    }
                    i = j + 1;
                }
            }
        }
        
        // Split text into alternating {type:'text'|'math', value} segments. 'math' covers
        // both LaTeX islands (findLatexRanges) and bare arithmetic (findMathRanges); the
        // DOM layer isolates both LTR. LaTeX wins when the two overlap.
        function segmentText(text) {
            var segs = [];
            if (!text) return segs;
            var ranges = findLatexRanges(text);
            var numeric = findMathRanges(text);
            for (var n = 0; n < numeric.length; n++) {
                var ns = numeric[n][0], ne = numeric[n][1], clash = false;
                for (var c = 0; c < ranges.length; c++) {
                    if (ns < ranges[c][1] && ne > ranges[c][0]) { clash = true; break; }
                }
                if (!clash) ranges.push(numeric[n]);
            }
            if (!ranges.length) {
                segs.push({ type: 'text', value: text });
                return segs;
            }
            ranges.sort(function (a, b) { return a[0] - b[0]; });
            var pos = 0;
            for (var i = 0; i < ranges.length; i++) {
                if (ranges[i][0] > pos) {
                    segs.push({ type: 'text', value: text.slice(pos, ranges[i][0]) });
                }
                segs.push({ type: 'math', value: text.slice(ranges[i][0], ranges[i][1]) });
                pos = ranges[i][1];
            }
            if (pos < text.length) segs.push({ type: 'text', value: text.slice(pos) });
            return segs;
        }
        
        // Classify a table cell's direction from its text. A cell counts as RTL if it
        // *contains* any RTL character -- not merely if its first strong char is RTL.
        // Header labels often start with a Latin term ("blob ...", "ID ...") yet belong
        // to an RTL column, so first-strong is too weak here. Neutral cells (digits,
        // hashes, punctuation only) return null so they do not sway the majority.
        function cellDir(text) {
            if (hasRTL(text)) return 'rtl';
            if (firstStrong(text) === 'ltr') return 'ltr';
            return null;
        }
        
        // Decide a whole table's column direction from header / first-column cell dirs.
        // Each input is an array of 'rtl' | 'ltr' | null. Header wins; first column is
        // the tie-breaker. Returns 'rtl' (flip columns) or null (leave LTR).
        function tableDirFromCells(headerDirs, firstColDirs) {
            // First header is the semantic key column (row labels). If it's RTL and the
            // first data cell agrees, the table is an RTL table regardless of how many
            // product/entity names appear as LTR in subsequent headers.
            if (headerDirs && headerDirs[0] === 'rtl' &&
                    firstColDirs && firstColDirs[0] === 'rtl') return 'rtl';
            var h = majorityDir(headerDirs || []);
            if (h === 'rtl') return 'rtl';
            if (h === 'ltr') return null;
            var c = majorityDir(firstColDirs || []);
            return c === 'rtl' ? 'rtl' : null;
        }
        
        function majorityDir(dirs) {
            var r = 0, l = 0;
            for (var i = 0; i < dirs.length; i++) {
                if (dirs[i] === 'rtl') r++;
                else if (dirs[i] === 'ltr') l++;
            }
            if (r > l) return 'rtl';
            if (l > r) return 'ltr';
            return null;
        }

        // <<< inlined src/rtl-core.cjs <<<
        // --- END PURE DETECTION CORE ---

        // ================= DOM ENGINE =================

        // Get text from element excluding <code> children (DOM-aware)
        function textWithoutCode(el) {
            var out = '';
            var nodes = el.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.nodeType === 3) { out += n.textContent; }
                else if (n.nodeType === 1 && n.tagName !== 'CODE' && n.tagName !== 'PRE') {
                    out += textWithoutCode(n);
                }
            }
            return out;
        }

        // --- PER-LINE DIRECTIONAL SPLITTING ---
        // A paragraph rendered with <br> separators or whitespace-pre may carry
        // multiple lines, each in a different script. Forcing a single dir on the
        // host mangles every line that disagrees. Defer to unicode-bidi:plaintext
        // and stamp a flag so later passes skip it.
        var RTL_SPLIT_FLAG = 'data-rtl-split';
        var BR_OR_NL_SPLIT = /(<br\s*\/?>|\n)/i;

        function hasMultiScriptLines(el) {
            var src = el.textContent;
            if (!src) return false;
            if (!/[a-zA-Z]{2,}/.test(src)) return false;
            if (!hasRTL(src)) return false;
            return BR_OR_NL_SPLIT.test(el.innerHTML) || src.indexOf('\n') !== -1;
        }

        function splitToDirectionalSpans(el) {
            if (el.hasAttribute(RTL_SPLIT_FLAG)) return;
            // No DOM rewriting -- assigning innerHTML breaks React reconciliation.
            // <br> is a paragraph separator in the Unicode BiDi algorithm, so with
            // unicode-bidi:plaintext each line auto-picks its direction.
            el.setAttribute(RTL_SPLIT_FLAG, '1');
            if (el.hasAttribute('dir')) el.removeAttribute('dir');
            el.style.direction = '';
            el.style.textAlign = 'start';
            el.style.unicodeBidi = 'plaintext';
        }

        // If an element inherits RTL via a parent CSS class (not an explicit dir
        // attribute on itself), removing dir alone won't free it -- pin ltr.
        function resetDirOrPinLTR(el) {
            if (window.getComputedStyle(el).direction === 'rtl') {
                el.dir = 'ltr';
                el.style.direction = 'ltr';
                return;
            }
            if (el.hasAttribute('dir')) el.removeAttribute('dir');
            el.style.direction = '';
        }

        // --- HYBRID DIRECTION DETECTION ---
        function detectElDir(el) {
            var full = el.textContent || '';
            if (!hasRTL(full)) return null;
            var noCode = textWithoutCode(el);
            var d = firstStrong(noCode);
            if (d === 'rtl') return 'rtl';
            var stripped = stripLeadingLTR(noCode);
            d = firstStrong(stripped);
            if (d === 'rtl') return 'rtl';
            // RTL chars exist but hide behind code/filenames -> treat as RTL.
            return 'rtl';
        }

        function detectTextDir(text) {
            if (!text || !text.trim()) return null;
            var d = firstStrong(text);
            if (d === 'rtl') return 'rtl';
            if (!hasRTL(text)) return 'ltr';
            var stripped = stripLeadingLTR(text);
            d = firstStrong(stripped);
            if (d === 'rtl') return 'rtl';
            return 'rtl';
        }

        // querySelectorAll that INCLUDES root itself if it matches
        function qsa(root, sel) {
            var base = root.querySelectorAll ? root : document;
            var els = Array.prototype.slice.call(base.querySelectorAll(sel));
            if (root.matches && root.matches(sel)) els.unshift(root);
            return els;
        }

        function forceCodeLTR(root) {
            qsa(root, 'pre, .code-block__code').forEach(function (b) {
                if (b.closest(EDITOR_SEL)) return;
                b.dir = 'ltr'; b.style.textAlign = 'left'; b.style.unicodeBidi = 'embed';
            });
            qsa(root, 'code').forEach(function (c) {
                if (c.closest(EDITOR_SEL)) return;
                if (!c.closest('pre') && !c.closest('.code-block__code')) c.dir = 'ltr';
            });
            qsa(root, '.katex, .katex-display, mjx-container').forEach(function (m) {
                if (m.closest(EDITOR_SEL)) return;
                m.style.unicodeBidi = 'isolate'; m.style.direction = 'ltr';
            });
        }

        // --- RAW LaTeX + BARE-ARITHMETIC ISOLATION ---
        // Inside an RTL paragraph the neutral $ \ { } chars scramble a formula and
        // bare arithmetic ("2 + 3 = 5") gets mirrored to "5 = 3 + 2". Isolate each
        // math segment (LaTeX or bare numeric, per segmentText) in its own
        // ltr/unicode-bidi:isolate span. Replace a single TEXT node with a fragment
        // (replaceChild) -- never innerHTML -- to stay gentle on React, and flag
        // islands so we never re-wrap during streaming.
        var ISLAND_FLAG = 'data-rtl-island';

        function isolateMath(root) {
            if (typeof document.createTreeWalker !== 'function') return;
            var host = (root && root.nodeType === 1) ? root : document.body;
            if (!host) return;
            var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
                acceptNode: function (node) {
                    var v = node.nodeValue;
                    if (!v) return NodeFilter.FILTER_REJECT;
                    var hasTex = v.indexOf('$') !== -1 || v.indexOf('\\') !== -1;
                    var hasNum = MATH_DIGIT_RE.test(v) && MATH_OP_RE.test(v);
                    if (!hasTex && !hasNum) return NodeFilter.FILTER_REJECT;
                    var p = node.parentElement;
                    if (!p) return NodeFilter.FILTER_REJECT;
                    if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
                    // replaceChild on a text node the user is typing into is the
                    // most violent mutation an editor can receive -- reject inside
                    // any editor to avoid a freeze loop.
                    if (p.closest('pre, code, .code-block__code, [' + ISLAND_FLAG + '], ' + EDITOR_SEL)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            var targets = [];
            var n;
            while ((n = walker.nextNode())) targets.push(n);
            targets.forEach(function (textNode) {
                var segs = segmentText(textNode.nodeValue);
                var hasMath = segs.some(function (s) { return s.type === 'math'; });
                if (!hasMath) return;
                var frag = document.createDocumentFragment();
                segs.forEach(function (s) {
                    if (s.type === 'math') {
                        var span = document.createElement('span');
                        span.setAttribute(ISLAND_FLAG, '1');
                        span.style.unicodeBidi = 'isolate';
                        span.style.direction = 'ltr';
                        span.textContent = s.value;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(s.value));
                    }
                });
                if (textNode.parentNode) textNode.parentNode.replaceChild(frag, textNode);
            });
        }

        // --- TABLE COLUMN ORDERING ---
        // An RTL table should read right-to-left: the first column on the right.
        // Per-cell direction is handled by processText; here we only flip the whole
        // table's column order via dir="rtl" on a stable <table> element.
        var TABLE_FLAG = 'data-rtl-table';

        function processTables(root) {
            qsa(root, 'table').forEach(function (t) {
                if (t.getAttribute(TABLE_FLAG) === 'rtl') return;
                if (t.closest(EDITOR_SEL)) return;
                var headerCells = Array.prototype.slice.call(t.querySelectorAll('thead th'));
                if (!headerCells.length) {
                    var firstRow = t.querySelector('tr');
                    if (firstRow) headerCells = Array.prototype.slice.call(firstRow.querySelectorAll('th, td'));
                }
                var headerDirs = headerCells.map(function (c) { return cellDir(c.textContent || ''); });
                var rows = Array.prototype.slice.call(t.querySelectorAll('tbody tr'));
                if (!rows.length) rows = Array.prototype.slice.call(t.querySelectorAll('tr')).slice(1);
                var firstColDirs = rows.map(function (r) {
                    var cell = r.querySelector('th, td');
                    return cell ? cellDir(cell.textContent || '') : null;
                });
                if (tableDirFromCells(headerDirs, firstColDirs) === 'rtl') {
                    t.setAttribute(TABLE_FLAG, 'rtl');
                    t.dir = 'rtl';
                    t.style.direction = 'rtl';
                }
            });
        }

        function processText(root) {
            qsa(root, 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, summary, label, dt, dd').forEach(function (el) {
                if (el.closest(EDITOR_SEL) || el.closest('pre') || el.closest('.code-block__code')) return;
                if (el.hasAttribute(RTL_SPLIT_FLAG)) return;
                var dir = detectElDir(el);
                if (dir) {
                    if (dir === 'rtl' && hasMultiScriptLines(el)) {
                        splitToDirectionalSpans(el);
                        return;
                    }
                    el.dir = dir;
                    el.style.direction = dir;
                    if (el.tagName === 'LI') {
                        el.style.listStylePosition = (dir === 'rtl') ? 'inside' : '';
                        var parentList = el.closest('ul, ol');
                        if (parentList && dir === 'rtl' && !parentList.hasAttribute('dir')) {
                            parentList.dir = 'rtl';
                            parentList.style.direction = 'rtl';
                            var pl = getComputedStyle(parentList).paddingLeft;
                            if (parseFloat(pl) > 0) { parentList.style.paddingRight = pl; parentList.style.paddingLeft = '0'; }
                        }
                    }
                } else {
                    resetDirOrPinLTR(el);
                    if (el.tagName === 'LI') el.style.listStylePosition = '';
                }
            });

            qsa(root, 'ul, ol').forEach(function (el) {
                if (el.closest(EDITOR_SEL) || el.closest('pre')) return;
                var dir = detectElDir(el);
                if (dir === 'rtl') {
                    el.dir = 'rtl';
                    el.style.direction = 'rtl';
                    var pl = getComputedStyle(el).paddingLeft;
                    if (parseFloat(pl) > 0) { el.style.paddingRight = pl; el.style.paddingLeft = '0'; }
                } else {
                    resetDirOrPinLTR(el);
                    el.style.paddingRight = ''; el.style.paddingLeft = '';
                }
            });
        }

        // Universal: process ANY leaf text container (dialogs, tooltips, etc.)
        function processContainers(root) {
            qsa(root, 'div, span, button, a, label').forEach(function (el) {
                if (el.closest('pre') || el.closest('code') || el.closest(EDITOR_SEL)) return;
                if (el.hasAttribute(RTL_SPLIT_FLAG)) return;
                if (el.hasAttribute(ISLAND_FLAG)) return;
                if (el.closest('.rtl-widget-container')) return; // never touch our own widget
                var parent = el.parentElement;
                if (parent && parent.hasAttribute(RTL_SPLIT_FLAG)) return;
                if (el.querySelector('p, div, ul, ol, h1, h2, h3, h4, h5, h6, pre, table')) return;
                if (/^(P|LI|H[1-6]|BLOCKQUOTE|TD|TH|UL|OL)$/.test(el.tagName)) return;
                var text = (el.textContent || '').trim();
                if (text.length < 2) return;
                if (hasRTL(text)) {
                    if (hasMultiScriptLines(el)) {
                        splitToDirectionalSpans(el);
                    } else {
                        el.dir = detectTextDir(text) || 'rtl';
                        el.style.textAlign = 'start';
                    }
                } else if (el.hasAttribute('dir')) {
                    el.removeAttribute('dir');
                    el.style.textAlign = '';
                }
            });
        }

        function processInput() {
            document.querySelectorAll(WRITING_SEL).forEach(function (input) {
                var text = input.textContent || input.innerText || input.value || '';
                var dir = detectTextDir(text);
                if (dir === 'rtl') {
                    input.style.direction = 'rtl'; input.style.textAlign = 'right';
                } else {
                    input.style.direction = 'ltr'; input.style.textAlign = 'left';
                }
            });
        }

        function processAll() {
            if (!rtlEnabled) return;
            isolateMath(document.body);
            processText(document);
            processContainers(document.body);
            processTables(document.body);
            processInput();
            forceCodeLTR(document.body);
        }

        // Baseline stylesheet: passive plaintext for un-dir'd text, code/math LTR,
        // table flip. Dynamic (font/line-height/force/master) lives in the second
        // sheet built by updateDynamicCSS.
        function injectBaselineStyles() {
            if (document.getElementById('codex-rtl-baseline')) return;
            var s = document.createElement('style');
            s.id = 'codex-rtl-baseline';
            // Broad plaintext net on prose. Codex renders chat text in div/span
            // (not semantic <p>), so span/div/[role="presentation"] MUST be
            // included or conversation text never auto-directs. The rules below
            // that protect code/islands/tables come AFTER this and win on
            // specificity ([data-rtl-island] > span) or later cascade order
            // (pre code descendants), so isolation still overrides plaintext.
            s.textContent = [
                'p,h1,h2,h3,h4,h5,h6,li,span,div,[role="presentation"]{unicode-bidi:plaintext!important;text-align:start!important}',
                '.rtl-widget-container,.rtl-widget-container *{direction:ltr!important;text-align:left!important;unicode-bidi:isolate!important}',
                'pre:not(.rtl-widget-container *),.code-block__code,pre:not(.rtl-widget-container *) *,code:not(.rtl-widget-container *) *,pre span,code span,[data-line] span{unicode-bidi:isolate!important;direction:ltr!important;text-align:left!important}',
                'code:not(.rtl-widget-container *){unicode-bidi:isolate!important;direction:ltr!important}',
                '[data-rtl-island]{unicode-bidi:isolate!important;direction:ltr!important;text-align:left!important}',
                '.katex,.katex-display,mjx-container{unicode-bidi:isolate!important;direction:ltr!important}',
                'table[dir="rtl"]{direction:rtl!important}',
                'ul:not(#_)[dir="rtl"],ol:not(#_)[dir="rtl"],[dir="rtl"] ul:not(#_),[dir="rtl"] ol:not(#_){padding-left:0!important;padding-right:1.25rem!important}'
            ].join('');
            document.head.appendChild(s);
        }

        function removeBaselineStyles() {
            var s = document.getElementById('codex-rtl-baseline');
            if (s && s.parentNode) s.parentNode.removeChild(s);
        }

        // Best-effort revert of everything the JS engine stamped, so toggling RTL
        // off actually returns the page to LTR (inline dir attrs would otherwise
        // linger). We only touch elements carrying our own flags/inline styles.
        function revertEngine() {
            removeBaselineStyles();
            var sel = 'p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,summary,label,dt,dd,ul,ol,div,span,button,a,table,pre,code';
            document.querySelectorAll(sel).forEach(function (el) {
                if (el.closest('.rtl-widget-container')) return;
                if (el.hasAttribute(RTL_SPLIT_FLAG)) el.removeAttribute(RTL_SPLIT_FLAG);
                if (el.getAttribute(TABLE_FLAG)) el.removeAttribute(TABLE_FLAG);
                if (el.hasAttribute('dir')) el.removeAttribute('dir');
                el.style.direction = '';
                el.style.textAlign = '';
                el.style.unicodeBidi = '';
                el.style.paddingRight = '';
                el.style.paddingLeft = '';
                el.style.listStylePosition = '';
            });
            document.querySelectorAll('[' + ISLAND_FLAG + ']').forEach(function (span) {
                if (span.parentNode) {
                    span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
                }
            });
        }

        // ================= DYNAMIC CSS (fonts / line-height / force / master) =================
        var rtlStyle = document.createElement('style');
        rtlStyle.id = 'codex-rtl-style';

        function updateDynamicCSS() {
            if (!rtlEnabled) {
                if (rtlStyle.parentNode) rtlStyle.parentNode.removeChild(rtlStyle);
                return;
            }

            var faFontRule = '';
            var faFontName = "'PersianOnlyFont'";
            if (savedFaFont) {
                faFontName = "'UserPersianFont', 'PersianOnlyFont'";
                var baseFaFont = savedFaFont.replace(/[-\s]?Regular$/i, '');
                faFontRule =
                    "@font-face{font-family:'UserPersianFont';src:local('" + savedFaFont + "'),local('" + baseFaFont + "');font-weight:400;unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF;}" +
                    "@font-face{font-family:'UserPersianFont';src:local('" + baseFaFont + " Bold'),local('" + baseFaFont + "-Bold'),local('" + baseFaFont + "Bold');font-weight:700;unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF;}";
            }

            var enFontStr = savedEnFont ? "'" + savedEnFont + "', ui-sans-serif, system-ui, sans-serif" : 'ui-sans-serif, system-ui, sans-serif';
            var codeFontStr = savedCodeFont ? "'" + savedCodeFont + "', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

            var forceRtlStyle = forceRTL ? [
                'p:not(.rtl-widget-container *),li:not(.rtl-widget-container *),',
                'h1:not(.rtl-widget-container *),h2:not(.rtl-widget-container *),h3:not(.rtl-widget-container *),',
                'h4:not(.rtl-widget-container *),h5:not(.rtl-widget-container *),h6:not(.rtl-widget-container *),',
                'textarea:not(.rtl-widget-container *),[contenteditable="true"]:not(.rtl-widget-container *),',
                '[contenteditable="true"] p:not(.rtl-widget-container *),[data-lexical-text="true"]:not(.rtl-widget-container *)',
                '{direction:rtl!important;text-align:right!important;unicode-bidi:isolate!important;}'
            ].join('') : '';

            rtlStyle.textContent = [
                faFontRule,
                "@font-face{font-family:'PersianOnlyFont';src:url('data:font/woff2;base64," + fontBase64 + "') format('woff2');font-weight:100 900;unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF;}",
                ':root,:host,html,body{font-family:' + faFontName + ',' + enFontStr + ',"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"!important;--diffs-font-family:' + codeFontStr + '!important;--diffs-font-fallback:' + codeFontStr + '!important;}',
                '.rtl-widget-container,.rtl-widget-container *{direction:ltr!important;text-align:left!important;unicode-bidi:isolate!important;}',
                forceRtlStyle,
                'pre:not(.rtl-widget-container *),code:not(.rtl-widget-container *),pre:not(.rtl-widget-container *) *,code:not(.rtl-widget-container *) *,[data-line] span{font-family:' + codeFontStr + '!important;}',
                'p:not(.rtl-widget-container *),li:not(.rtl-widget-container *),h1:not(.rtl-widget-container *),h2:not(.rtl-widget-container *),h3:not(.rtl-widget-container *),[contenteditable="true"] p:not(.rtl-widget-container *),[data-lexical-text="true"]:not(.rtl-widget-container *){line-height:' + savedLH + '!important;}'
            ].join('\n');

            if (!rtlStyle.parentNode) document.head.appendChild(rtlStyle);
        }

        // ================= ENGINE LIFECYCLE =================
        var _obs = null;
        var _engineOn = false;

        function attachObserver() {
            if (_obs) return;
            var pendingMuts = [];
            function mutInsideEditor(m) {
                var t = m.target;
                var el = (t && t.nodeType === 1) ? t : (t ? t.parentElement : null);
                return !!(el && el.closest && el.closest(EDITOR_SEL));
            }
            _obs = new MutationObserver(function (muts) {
                if (!rtlEnabled) return;
                var relevant = [];
                for (var i = 0; i < muts.length; i++) {
                    var m = muts[i];
                    if (m.addedNodes.length === 0 && m.type !== 'characterData') continue;
                    if (mutInsideEditor(m)) continue;
                    // Ignore our own widget's mutations.
                    var tgt = m.target;
                    var tel = (tgt && tgt.nodeType === 1) ? tgt : (tgt ? tgt.parentElement : null);
                    if (tel && tel.closest && tel.closest('.rtl-widget-container')) continue;
                    relevant.push(m);
                }
                if (!relevant.length) return;
                for (var j = 0; j < relevant.length; j++) pendingMuts.push(relevant[j]);
                if (window._codexRtlT) return; // throttle
                window._codexRtlT = setTimeout(function () {
                    window._codexRtlT = null;
                    if (!rtlEnabled) { pendingMuts = []; return; }
                    var toProcess = pendingMuts;
                    pendingMuts = [];
                    var roots = new Set();
                    toProcess.forEach(function (m) {
                        m.addedNodes.forEach(function (n) { if (n.nodeType === 1) roots.add(n); });
                        if (m.type === 'characterData' && m.target.parentElement) roots.add(m.target.parentElement);
                    });
                    var expanded = new Set(roots);
                    roots.forEach(function (r) {
                        if (!r.closest) return;
                        var txt = r.closest('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, summary, label, dt, dd');
                        if (txt) expanded.add(txt);
                        var list = r.closest('ul, ol');
                        if (list) expanded.add(list);
                        var tbl = r.closest('table');
                        if (tbl) expanded.add(tbl);
                    });
                    roots = expanded;
                    if (roots.size > 0 && roots.size <= 30) {
                        roots.forEach(function (r) {
                            isolateMath(r);
                            processText(r);
                            processContainers(r);
                            processTables(r);
                            forceCodeLTR(r);
                        });
                        processInput();
                    } else {
                        processAll();
                    }
                }, 50);
            });
            _obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        }

        function startEngine() {
            if (_engineOn) { updateDynamicCSS(); processAll(); return; }
            _engineOn = true;
            injectBaselineStyles();
            updateDynamicCSS();
            processAll();
            attachObserver();
        }

        function stopEngine() {
            _engineOn = false;
            updateDynamicCSS(); // removes dynamic sheet when rtlEnabled is false
            revertEngine();
        }

        // Global Shift+2 -> "@" fix for Persian keyboard layouts.
        document.addEventListener('keydown', function (e) {
            if (!fixAtSign) return;
            if (e.code === 'Digit2' && e.shiftKey) {
                if (e.key === '٬' || e.key === '،') {
                    e.preventDefault();
                    document.execCommand('insertText', false, '@');
                }
            }
        }, { capture: true });

        // Persist config back to the main process via the console channel that
        // bin/index.js listens for (SAVE_RTL_CONFIG|<json>).
        function saveConfig() {
            console.log('SAVE_RTL_CONFIG|' + JSON.stringify({
                isRTL: rtlEnabled,
                forceRTL: forceRTL,
                fixAtSign: fixAtSign,
                faFont: savedFaFont,
                enFont: savedEnFont,
                codeFont: savedCodeFont,
                lh: savedLH
            }));
        }

        // ================= SETTINGS WIDGET (inlined by build-payload.mjs) =================
        // >>> inlined src/rtl-widget.js >>>
        // rtl-widget.js -- the floating settings panel.
        //
        // TEMPLATE FRAGMENT. build-payload.mjs inlines this at the /*__RTL_WIDGET__*/
        // marker inside src/rtl-payload.js, so it runs in the same scope as the engine
        // and can read/write the state vars (rtlEnabled, forceRTL, savedFaFont, ...) and call
        // the lifecycle functions (startEngine, stopEngine, updateDynamicCSS, saveConfig)
        // directly. Do NOT wrap it in its own IIFE.
        
        if (!document.getElementById('rtl-widget-style')) {
            var widgetStyle = document.createElement('style');
            widgetStyle.id = 'rtl-widget-style';
            widgetStyle.innerHTML = [
                '.rtl-widget-container{position:fixed;bottom:16px;right:16px;z-index:99999;direction:ltr;font-family:inherit;}',
                '.rtl-widget-trigger{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background-color:var(--scrollbar-thumb,#555);color:#fff;cursor:pointer;opacity:0.8;transition:all 0.3s ease-in-out;}',
                '.rtl-widget-trigger:hover{transform:scale(1.1);opacity:1;}',
                '.rtl-widget-container:hover .rtl-widget-trigger{opacity:0;transform:scale(0.5);pointer-events:none;}',
                '.rtl-widget-panel{position:absolute;bottom:0;right:0;width:270px;transform:scale(0);transform-origin:bottom right;opacity:0;pointer-events:none;transition:all 0.3s ease-in-out;}',
                '.rtl-widget-container:hover .rtl-widget-panel{transform:scale(1);opacity:1;pointer-events:auto;}',
                '.rtl-tooltip{visibility:hidden;opacity:0;transition:opacity 0.15s ease-in-out;pointer-events:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:8px;width:200px;padding:8px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:999999!important;white-space:normal;text-align:center;background-color:light-dark(#ffffff,#202123)!important;border:1px solid light-dark(#e5e7eb,#4d4d4d)!important;color:var(--color-token-foreground,#fff)!important;font-size:11px;line-height:1.4;}',
                '.rtl-tooltip::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border-width:5px;border-style:solid;border-color:light-dark(#e5e7eb,#4d4d4d) transparent transparent transparent!important;}',
                '.rtl-info-icon{position:relative;display:inline-flex;align-items:center;justify-content:center;z-index:50;opacity:0.5;transition:opacity 0.15s ease-in-out;}',
                '.rtl-info-icon:hover{opacity:1;}',
                '.rtl-info-icon:hover .rtl-tooltip{visibility:visible;opacity:1;}',
                '.rtl-github-link{display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:600;opacity:0.7;text-decoration:none;padding-top:4px;padding-bottom:2px;transition:all 0.15s ease-in-out;color:var(--color-token-foreground,#fff)!important;}',
                '.rtl-github-link:hover{opacity:1;color:#ffd700!important;}'
            ].join('');
            document.head.appendChild(widgetStyle);
        }
        
        var widgetWrapper = document.createElement('div');
        widgetWrapper.className = 'rtl-widget-container';
        widgetWrapper.innerHTML = `
              <div class="rtl-widget-trigger">
                <svg height="20" width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              </div>
        
              <div class="rtl-widget-panel">
                <div class="relative flex max-h-full min-h-0 flex-col rounded-3xl bg-token-dropdown-background pt-3 border border-token-border-default shadow-md">
                  <div class="flex flex-col gap-2 px-3 pb-3 pt-0 w-full h-full" style="display: flex; flex-direction: column; gap: 8px;">
        
                    <div class="border-b border-token-border-default pb-2 mb-1 text-center" style="text-align: center !important;">
                        <div class="electron:heading-lg heading-base truncate text-center" style="color: var(--color-token-foreground); display: flex !important; justify-content: center !important; text-align: center; width: 100%;">Codex Smart RTL</div>
                    </div>
        
                    <div class="flex items-center justify-between gap-4 px-1" style="display: flex; justify-content: space-between; align-items: center;">
                      <span id="rtl-toggle-label" class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">${rtlEnabled ? 'Enabled' : 'Disabled'}</span>
                      <button id="rtl-toggle-btn" type="button" style="background-color: ${rtlEnabled ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                        <span id="rtl-toggle-knob" style="margin-left: 4px; transform: ${rtlEnabled ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
                      </button>
                    </div>
        
                    <div id="rtl-settings-wrapper" style="position: relative; z-index: 10; opacity: ${rtlEnabled ? '1' : '0.4'}; pointer-events: ${rtlEnabled ? 'auto' : 'none'}; display: flex; flex-direction: column; gap: 8px; transition: opacity 0.3s;">
                        <div class="flex items-center justify-between gap-2 px-1 mt-1" style="display: flex; justify-content: space-between; align-items: center;">
                          <div style="display: flex; align-items: center; gap: 4px;">
                            <span class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">Force RTL</span>
                            <div class="rtl-info-icon" style="color: var(--color-token-foreground); cursor: pointer; margin-left: 2px;">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M450-290h60V-520H450v230Zm52.92-307.75q9.38-9.29 9.38-23.02t-9.29-23.02T480-653.07t-23.02,9.29t-9.29,23.02t9.38,23.02T480-588.46t22.92-9.29ZM480.07-100q-78.84,0-148.2-29.92T211.18-211.13T129.93-331.76T100-479.93t29.92-148.2t81.21-120.68t120.63-81.25T479.93-860t148.2,29.92t120.68,81.21t81.25,120.63T860-480.07t-29.92,148.2T748.87-211.18T628.24-129.93T480.07-100ZM480-160q134,0 227-93t93-227T707-707T480-800T253-707T160-480t93,227t227,93Zm0-320Z"></path></svg>
                              <div class="rtl-tooltip">Forces RTL layout on all elements, even if the text starts with English characters.</div>
                            </div>
                          </div>
                          <button id="rtl-force-btn" type="button" style="background-color: ${forceRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                            <span id="rtl-force-knob" style="margin-left: 4px; transform: ${forceRTL ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
                          </button>
                        </div>
        
                        <div class="h-px bg-token-border-default w-full"></div>
        
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                          <span class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">FA/AR Font</span>
                          <input id="rtl-fafont-input" type="text" placeholder="Default: Vazirmatn" value="${savedFaFont}" class="focus-visible:ring-token-focus h-7 w-full max-w-[8.5rem] rounded-lg border border-token-border bg-token-input-background px-2 text-xs text-token-text-primary shadow-sm outline-none focus-visible:ring-2 max-sm:max-w-none" spellcheck="false">
                        </div>
        
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                          <span class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">EN Font</span>
                          <input id="rtl-enfont-input" type="text" placeholder="Default: System" value="${savedEnFont}" class="focus-visible:ring-token-focus h-7 w-full max-w-[8.5rem] rounded-lg border border-token-border bg-token-input-background px-2 text-xs text-token-text-primary shadow-sm outline-none focus-visible:ring-2 max-sm:max-w-none" spellcheck="false">
                        </div>
        
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                          <span class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">Code Font</span>
                          <input id="rtl-codefont-input" type="text" placeholder="Default: System" value="${savedCodeFont}" class="focus-visible:ring-token-focus h-7 w-full max-w-[8.5rem] rounded-lg border border-token-border bg-token-input-background px-2 text-xs text-token-text-primary shadow-sm outline-none focus-visible:ring-2 max-sm:max-w-none" spellcheck="false">
                        </div>
        
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; height: 28px;">
                          <span class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">Line Height</span>
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <input id="rtl-lh-input" type="range" min="1.2" max="2.5" step="0.1" value="${savedLH}" style="width: 80px; cursor: pointer; accent-color: var(--color-token-charts-blue, #339cff);">
                            <button id="rtl-lh-reset" type="button" class="text-token-text-primary opacity-50 hover:opacity-100 transition-opacity cursor-pointer text-sm" style="background: none; border: none; padding: 0;">↺</button>
                          </div>
                        </div>
        
                        <div class="h-px bg-token-border-default w-full"></div>
        
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                          <div style="display: flex; align-items: center; gap: 4px;">
                            <span class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">Type @ with Shift+2</span>
                            <div class="rtl-info-icon" style="color: var(--color-token-foreground); cursor: pointer; margin-left: 2px;">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M450-290h60V-520H450v230Zm52.92-307.75q9.38-9.29 9.38-23.02t-9.29-23.02T480-653.07t-23.02,9.29t-9.29,23.02t9.38,23.02T480-588.46t22.92-9.29ZM480.07-100q-78.84,0-148.2-29.92T211.18-211.13T129.93-331.76T100-479.93t29.92-148.2t81.21-120.68t120.63-81.25T479.93-860t148.2,29.92t120.68,81.21t81.25,120.63T860-480.07t-29.92,148.2T748.87-211.18T628.24-129.93T480.07-100ZM480-160q134,0 227-93t93-227T707-707T480-800T253-707T160-480t93,227t227,93Zm0-320Z"></path></svg>
                              <div class="rtl-tooltip">Automatically converts '٬' to '@' when you press Shift+2 on a Persian keyboard layout.</div>
                            </div>
                          </div>
                          <button id="rtl-at-btn" type="button" style="background-color: ${fixAtSign ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                            <span id="rtl-at-knob" style="margin-left: 4px; transform: ${fixAtSign ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
                          </button>
                        </div>
        
                        <div class="h-px bg-token-border-default w-full"></div>
        
                        <a href="https://github.com/mmnaderi/codex-rtl" target="_blank" class="rtl-github-link">
                          <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>
                          Star on GitHub
                        </a>
                    </div>
                  </div>
                </div>
              </div>
        `;
        document.body.appendChild(widgetWrapper);
        
        var _wToggleBtn = document.getElementById('rtl-toggle-btn');
        var _wToggleKnob = document.getElementById('rtl-toggle-knob');
        var _wToggleLabel = document.getElementById('rtl-toggle-label');
        var _wSettingsWrapper = document.getElementById('rtl-settings-wrapper');
        var _wForceBtn = document.getElementById('rtl-force-btn');
        var _wForceKnob = document.getElementById('rtl-force-knob');
        var _wAtBtn = document.getElementById('rtl-at-btn');
        var _wAtKnob = document.getElementById('rtl-at-knob');
        var _wFaFontInput = document.getElementById('rtl-fafont-input');
        var _wEnFontInput = document.getElementById('rtl-enfont-input');
        var _wCodeFontInput = document.getElementById('rtl-codefont-input');
        var _wLhInput = document.getElementById('rtl-lh-input');
        var _wLhResetBtn = document.getElementById('rtl-lh-reset');
        
        _wToggleBtn.addEventListener('click', function () {
            rtlEnabled = !rtlEnabled;
            saveConfig();
            _wToggleLabel.innerText = rtlEnabled ? 'Enabled' : 'Disabled';
            _wSettingsWrapper.style.opacity = rtlEnabled ? '1' : '0.4';
            _wSettingsWrapper.style.pointerEvents = rtlEnabled ? 'auto' : 'none';
            _wToggleKnob.style.transform = rtlEnabled ? 'translateX(20px)' : 'translateX(0)';
            _wToggleBtn.style.backgroundColor = rtlEnabled ? 'var(--color-token-charts-blue, #339cff)' : '#555';
            if (rtlEnabled) startEngine(); else stopEngine();
        });
        
        _wForceBtn.addEventListener('click', function () {
            forceRTL = !forceRTL;
            saveConfig();
            _wForceKnob.style.transform = forceRTL ? 'translateX(20px)' : 'translateX(0)';
            _wForceBtn.style.backgroundColor = forceRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555';
            updateDynamicCSS();
        });
        
        _wAtBtn.addEventListener('click', function () {
            fixAtSign = !fixAtSign;
            saveConfig();
            _wAtKnob.style.transform = fixAtSign ? 'translateX(20px)' : 'translateX(0)';
            _wAtBtn.style.backgroundColor = fixAtSign ? 'var(--color-token-charts-blue, #339cff)' : '#555';
        });
        
        _wFaFontInput.addEventListener('input', function () {
            savedFaFont = _wFaFontInput.value.trim();
            saveConfig();
            updateDynamicCSS();
        });
        
        _wEnFontInput.addEventListener('input', function () {
            savedEnFont = _wEnFontInput.value.trim();
            saveConfig();
            updateDynamicCSS();
        });
        
        _wCodeFontInput.addEventListener('input', function () {
            savedCodeFont = _wCodeFontInput.value.trim();
            saveConfig();
            updateDynamicCSS();
        });
        
        _wLhInput.addEventListener('input', function () {
            savedLH = _wLhInput.value;
            saveConfig();
            updateDynamicCSS();
        });
        
        _wLhResetBtn.addEventListener('click', function () {
            _wLhInput.value = '1.6';
            savedLH = '1.6';
            saveConfig();
            updateDynamicCSS();
        });

        // <<< inlined src/rtl-widget.js <<<

        // ================= INIT =================
        if (rtlEnabled) startEngine(); else updateDynamicCSS();
    } catch (e) {
        try { console.error('[Codex RTL]', e); } catch (_) {}
    }
})();

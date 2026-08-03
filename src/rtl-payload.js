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

        // Codex is a natively LTR app; only the conversation should flip. Confine
        // ALL direction work to the message thread (.thread-scroll-container) plus
        // the composer, so the app's own chrome -- sidebar (aside.app-shell-left-panel),
        // navigation, top menus, toolbars -- stays in its native LTR. Chrome must
        // stay LTR to match the window-controls fix.
        var CONVERSATION_SEL = '.thread-scroll-container';
        // Chrome we must never touch even via the global composer/input pass.
        var CHROME_SEL = 'aside, nav, [role="navigation"], [role="menubar"], [role="toolbar"], header';

        // The live conversation roots. Falls back to the largest vertical scroller
        // (then <body>) so a future class rename degrades instead of breaking.
        function conversationRoots() {
            var roots = Array.prototype.slice.call(document.querySelectorAll(CONVERSATION_SEL));
            if (roots.length) return roots;
            var best = null, bestH = 0;
            var els = document.querySelectorAll('main, section, div');
            for (var i = 0; i < els.length; i++) {
                var e = els[i];
                if (e.closest(CHROME_SEL)) continue;
                if (e.scrollHeight > e.clientHeight + 60) {
                    var s = window.getComputedStyle(e);
                    if (/auto|scroll/.test(s.overflowY) && e.scrollHeight > bestH) { best = e; bestH = e.scrollHeight; }
                }
            }
            return best ? [best] : [document.body];
        }

        // True if the node sits inside the conversation thread.
        function inConversation(node) {
            var el = (node && node.nodeType === 1) ? node : (node ? node.parentElement : null);
            return !!(el && el.closest && el.closest(CONVERSATION_SEL));
        }

        // --- PURE DETECTION CORE (inlined from src/rtl-core.cjs by build-payload.mjs) ---
        /*__RTL_CORE__*/
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
                // The composer is the only rich-text input we direct. Never touch
                // inputs that live in the app chrome (e.g. sidebar search).
                if (input.closest(CHROME_SEL)) return;
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
            // Scope every pass to the conversation thread; leave app chrome LTR.
            conversationRoots().forEach(function (root) {
                isolateMath(root);
                processText(root);
                processContainers(root);
                processTables(root);
                forceCodeLTR(root);
            });
            processInput(); // composer lives outside the thread scroller
        }

        // Baseline stylesheet: passive plaintext for un-dir'd text, code/math LTR,
        // table flip. Dynamic (font/line-height/force/master) lives in the second
        // sheet built by updateDynamicCSS.
        function injectBaselineStyles() {
            if (document.getElementById('codex-rtl-baseline')) return;
            var s = document.createElement('style');
            s.id = 'codex-rtl-baseline';
            // Broad plaintext net on prose, but SCOPED to the conversation thread
            // (C) so the app chrome stays LTR. Codex renders chat text in div/span
            // (not semantic <p>), so span/div/[role="presentation"] must be included
            // or conversation text never auto-directs. The composer (a rich-text
            // editor outside the thread scroller) is covered by its own rule. The
            // code/island/table rules come AFTER and win on specificity
            // ([data-rtl-island] > span) or later cascade order (pre code
            // descendants), so isolation still overrides plaintext.
            var C = CONVERSATION_SEL + ' ';
            var prose = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'div', '[role="presentation"]']
                .map(function (t) { return C + t; }).join(',');
            var codeSel = [C + 'pre', C + '.code-block__code', C + 'pre *', C + 'code *', C + 'pre span', C + 'code span', C + '[data-line] span'].join(',');
            s.textContent = [
                prose + '{unicode-bidi:plaintext!important;text-align:start!important}',
                // Composer input (rich-text editor, lives outside the thread scroller).
                '[contenteditable="true"] p,[data-lexical-text="true"]{unicode-bidi:plaintext!important;text-align:start!important}',
                '.rtl-widget-container,.rtl-widget-container *{direction:ltr!important;text-align:left!important;unicode-bidi:isolate!important}',
                codeSel + '{unicode-bidi:isolate!important;direction:ltr!important;text-align:left!important}',
                C + 'code{unicode-bidi:isolate!important;direction:ltr!important}',
                '[data-rtl-island]{unicode-bidi:isolate!important;direction:ltr!important;text-align:left!important}',
                C + '.katex,' + C + '.katex-display,' + C + 'mjx-container{unicode-bidi:isolate!important;direction:ltr!important}',
                C + 'table[dir="rtl"]{direction:rtl!important}',
                C + 'ul[dir="rtl"],' + C + 'ol[dir="rtl"],' + C + '[dir="rtl"] ul,' + C + '[dir="rtl"] ol{padding-left:0!important;padding-right:1.25rem!important}'
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

            // Everything the dynamic sheet does is scoped to the conversation (C)
            // plus the composer, so fonts / line-height / Force-RTL never touch the
            // app's own LTR chrome.
            var C = CONVERSATION_SEL + ' ';
            var COMPOSER = '[contenteditable="true"] p,[data-lexical-text="true"],[contenteditable="true"]';

            var forceRtlStyle = forceRTL ? (
                [C + 'p', C + 'li', C + 'h1', C + 'h2', C + 'h3', C + 'h4', C + 'h5', C + 'h6', COMPOSER].join(',') +
                '{direction:rtl!important;text-align:right!important;unicode-bidi:isolate!important;}'
            ) : '';

            rtlStyle.textContent = [
                faFontRule,
                "@font-face{font-family:'PersianOnlyFont';src:url('data:font/woff2;base64," + fontBase64 + "') format('woff2');font-weight:100 900;unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF;}",
                // Font scoped to the conversation + composer (not :root), so chrome keeps its own font.
                CONVERSATION_SEL + ',' + CONVERSATION_SEL + ' *,' + COMPOSER + '{font-family:' + faFontName + ',' + enFontStr + ',"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"!important;}',
                ':root{--diffs-font-family:' + codeFontStr + '!important;--diffs-font-fallback:' + codeFontStr + '!important;}',
                '.rtl-widget-container,.rtl-widget-container *{direction:ltr!important;text-align:left!important;unicode-bidi:isolate!important;}',
                forceRtlStyle,
                C + 'pre,' + C + 'code,' + C + 'pre *,' + C + 'code *,' + C + '[data-line] span{font-family:' + codeFontStr + '!important;}',
                [C + 'p', C + 'li', C + 'h1', C + 'h2', C + 'h3', '[contenteditable="true"] p', '[data-lexical-text="true"]'].join(',') + '{line-height:' + savedLH + '!important;}'
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
                    // Only react to mutations inside the conversation thread -- app
                    // chrome (sidebar, menus) must stay LTR and never be reprocessed.
                    if (!inConversation(m.target)) continue;
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
        /*__RTL_WIDGET__*/

        // ================= INIT =================
        if (rtlEnabled) startEngine(); else updateDynamicCSS();
    } catch (e) {
        try { console.error('[Codex RTL]', e); } catch (_) {}
    }
})();

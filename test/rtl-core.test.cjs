'use strict';

const test = require('node:test');
const assert = require('node:assert');
const core = require('../src/rtl-core.cjs');

const cp = (s) => s.codePointAt(0);

test('isRTL covers expanded ranges', () => {
    assert.ok(core.isRTL(cp('א')), 'Hebrew');
    assert.ok(core.isRTL(cp('ا')), 'Arabic');
    assert.ok(core.isRTL(cp('پ')), 'Persian (Arabic block)');
    assert.ok(core.isRTL(cp('ܐ')), 'Syriac');
    assert.ok(core.isRTL(cp('ހ')), 'Thaana');
    assert.ok(core.isRTL(cp('ߒ')), 'NKo');
    assert.ok(core.isRTL(cp('𞤀')), 'Adlam (astral)');
    assert.ok(!core.isRTL(cp('A')), 'Latin');
    assert.ok(!core.isRTL(cp('5')), 'digit');
    assert.ok(!core.isRTL(cp('$')), 'dollar');
});

test('hasRTL walks code points (astral safe)', () => {
    assert.ok(core.hasRTL('hello سلام'));
    assert.ok(core.hasRTL('text 𞤀𞤣'));       // Adlam only
    assert.ok(!core.hasRTL('plain ascii 123'));
    assert.ok(!core.hasRTL('price $5.99'));
});

test('firstStrong picks first strong character', () => {
    assert.strictEqual(core.firstStrong('سلام world'), 'rtl');
    assert.strictEqual(core.firstStrong('world سلام'), 'ltr');
    assert.strictEqual(core.firstStrong('123 — سلام'), 'rtl');
    assert.strictEqual(core.firstStrong('123 456'), null);
});

test('currency $ is NOT treated as LaTeX', () => {
    assert.deepStrictEqual(core.findLatexRanges('قیمت آن $5.99 است'), []);
    assert.deepStrictEqual(core.findLatexRanges('از $5 تا $10'), []);
    assert.deepStrictEqual(core.findLatexRanges('costs $20 and $30'), []);
});

test('real LaTeX is detected', () => {
    assert.strictEqual(core.findLatexRanges('این $x^2$ اینجا').length, 1);
    assert.strictEqual(core.findLatexRanges('فرمول $$\\frac{a}{b}$$ اینجا').length, 1);
    assert.strictEqual(core.findLatexRanges('inline \\(a+b\\) here').length, 1);
    assert.strictEqual(core.findLatexRanges('block \\[E=mc^2\\] done').length, 1);
});

test('$$ wins over inner single $', () => {
    const ranges = core.findLatexRanges('a $$x = 5$$ b');
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual('a $$x = 5$$ b'.slice(ranges[0][0], ranges[0][1]), '$$x = 5$$');
});

test('segmentText splits text and math', () => {
    const segs = core.segmentText('فارسی $x^2$ باز');
    assert.strictEqual(segs.length, 3);
    assert.strictEqual(segs[0].type, 'text');
    assert.strictEqual(segs[1].type, 'math');
    assert.strictEqual(segs[1].value, '$x^2$');
    assert.strictEqual(segs[2].type, 'text');
});

test('segmentText with no math returns single text segment', () => {
    const segs = core.segmentText('یک متن ساده با $5 قیمت');
    assert.strictEqual(segs.length, 1);
    assert.strictEqual(segs[0].type, 'text');
});

test('cellDir: contains-RTL beats first-strong (header starting with Latin term)', () => {
    assert.strictEqual(core.cellDir('blob محلی (HEAD c16c988)'), 'rtl'); // Latin-first but RTL column
    assert.strictEqual(core.cellDir('blob از-CDN'), 'rtl');
    assert.strictEqual(core.cellDir('پرونده'), 'rtl');
    assert.strictEqual(core.cellDir('patch.ps1'), 'ltr');
    assert.strictEqual(core.cellDir('9f954eb'), 'ltr');  // hex still has Latin letters (f,e,b)
    assert.strictEqual(core.cellDir('123.45'), null);    // truly neutral: no letters, no sway
});

test('tableDirFromCells: header majority RTL → rtl', () => {
    const headers = [core.firstStrong('فارسی'), core.firstStrong('English'), core.firstStrong('ترجمه')];
    assert.strictEqual(core.tableDirFromCells(headers, []), 'rtl');
});

test('table with Latin-first RTL headers flips (regression: CDN comparison table)', () => {
    const headers = ['پرونده', 'blob محلی (HEAD c16c988)', 'blob از-CDN', 'نتیجه'].map(core.cellDir);
    const firstCol = ['patch.ps1', 'patch.ps1.sig'].map(core.cellDir); // Latin first column
    assert.deepStrictEqual(headers, ['rtl', 'rtl', 'rtl', 'rtl']);
    assert.strictEqual(core.tableDirFromCells(headers, firstCol), 'rtl');
});

test('mostly-English table does NOT flip even with one RTL header', () => {
    const headers = ['Name', 'Value', 'نام'].map(core.cellDir);
    assert.strictEqual(core.tableDirFromCells(headers, []), null);
});

test('tableDirFromCells: header majority LTR → null (no flip)', () => {
    const headers = [core.firstStrong('Name'), core.firstStrong('Value'), core.firstStrong('نام')];
    assert.strictEqual(core.tableDirFromCells(headers, []), null);
});

test('tableDirFromCells: first column tie-breaks when headers are inconclusive', () => {
    const headers = [null, null];
    const firstCol = [core.firstStrong('سلام'), core.firstStrong('ممنون'), core.firstStrong('خانه')];
    assert.strictEqual(core.tableDirFromCells(headers, firstCol), 'rtl');
});

test('stripLeadingLTR drops leading filename then detects RTL', () => {
    const stripped = core.stripLeadingLTR('foo.js سلام دنیا');
    assert.strictEqual(core.firstStrong(stripped), 'rtl');
});

// --- bare numeric / arithmetic isolation (findMathRanges) ---

const mathSubs = (s) => core.findMathRanges(s).map(([a, b]) => s.slice(a, b));

test('findMathRanges isolates bare arithmetic inside Persian', () => {
    assert.deepStrictEqual(mathSubs('نتیجه برابر 2 + 3 = 5 است'), ['2 + 3 = 5']);
    assert.deepStrictEqual(mathSubs('بازه آن 5-3 درجه'), ['5-3']);
    assert.deepStrictEqual(mathSubs('نصف یعنی 1/2 از کیک'), ['1/2']);
    assert.deepStrictEqual(mathSubs('موفقیت 95% کاربران'), ['95%']);
    assert.deepStrictEqual(mathSubs('اگر x = 10 آنگاه y = 20'), ['x = 10', 'y = 20']);
    assert.deepStrictEqual(mathSubs('no spaces 2+3=5 here'), ['2+3=5']);
});

test('findMathRanges keeps a trailing sentence period out of the island', () => {
    assert.deepStrictEqual(mathSubs('در مجموع 2 + 3 = 5.'), ['2 + 3 = 5']);
    assert.deepStrictEqual(mathSubs('اینطور: 10 / 2 = 5, درست'), ['10 / 2 = 5']);
});

test('findMathRanges keeps internal decimals/thousands intact', () => {
    assert.deepStrictEqual(mathSubs('مبلغ 1.5 + 2.5 = 4.0 تومان'), ['1.5 + 2.5 = 4.0']);
    assert.deepStrictEqual(mathSubs('نسبت 3.14 * 2 تقریبا'), ['3.14 * 2']);
});

test('findMathRanges leaves lone numbers / dates / IPs / versions alone', () => {
    assert.deepStrictEqual(mathSubs('من 5 سگ دارم'), []);            // lone number
    assert.deepStrictEqual(mathSubs('صفحه 3 کتاب را ببین'), []);     // lone number
    assert.deepStrictEqual(mathSubs('نسخه فعلی 1.14271.0.0 است'), []); // dotted version, no operator
    assert.deepStrictEqual(mathSubs('آدرس 192.168.1.1 در شبکه'), []); // IP, dots only
    assert.deepStrictEqual(mathSubs('ساعت 12:30 می‌بینمت'), []);      // time, colon only
    assert.deepStrictEqual(mathSubs('1. مورد اول'), []);             // ordered-list marker
});

test('findMathRanges leaves currency alone', () => {
    assert.deepStrictEqual(mathSubs('قیمت $5 + $10 فقط'), []);       // '$' breaks the run
    assert.deepStrictEqual(mathSubs('روزانه $5.99 است'), []);        // currency, no operator
});

test('findMathRanges does not swallow surrounding English words', () => {
    assert.deepStrictEqual(mathSubs('for 2 + 3 apples total'), ['2 + 3']);
    assert.deepStrictEqual(mathSubs('version 2 of 3 ready'), []);   // no operator between the numbers
});

test('findMathRanges supports common Unicode operators', () => {
    assert.deepStrictEqual(mathSubs('مساحت 4 × 5 = 20'), ['4 × 5 = 20']); // x multiply, =
    assert.deepStrictEqual(mathSubs('دما −5 ≤ 0 درجه'), ['−5 ≤ 0']); // minus-sign, <=
});

test('findMathRanges does not cross a newline', () => {
    assert.deepStrictEqual(mathSubs('خط 2 + 3\nخط 4 + 5'), ['2 + 3', '4 + 5']);
});

test('segmentText isolates bare arithmetic as a math segment', () => {
    const segs = core.segmentText('فارسی 2 + 3 = 5 باز');
    assert.strictEqual(segs.length, 3);
    assert.strictEqual(segs[0].type, 'text');
    assert.strictEqual(segs[1].type, 'math');
    assert.strictEqual(segs[1].value, '2 + 3 = 5');
    assert.strictEqual(segs[2].type, 'text');
});

test('segmentText: LaTeX wins over an overlapping numeric run', () => {
    const segs = core.segmentText('فرمول $x^2 + 1$ پایان');
    const math = segs.filter((s) => s.type === 'math');
    assert.strictEqual(math.length, 1);
    assert.strictEqual(math[0].value, '$x^2 + 1$'); // not split by the inner "+ 1"
});

test('segmentText still returns single segment for currency-only text (regression)', () => {
    const segs = core.segmentText('یک متن ساده با $5 قیمت');
    assert.strictEqual(segs.length, 1);
    assert.strictEqual(segs[0].type, 'text');
});

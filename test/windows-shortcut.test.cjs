'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildShortcutInvocation } = require('../bin/windows-shortcut.cjs');

const EXE  = 'C:\\Program Files\\Codex\\codex.exe';
const DEST = 'C:\\Program Files\\Codex';
const LNK  = 'C:\\Users\\user\\Desktop\\Codex (Patched).lnk';

function getScript(result) {
    const cmdIndex = result.args.indexOf('-Command');
    assert.ok(cmdIndex !== -1, '-Command flag must be present');
    return result.args[cmdIndex + 1];
}

test('baseline: env vars carry the three paths', () => {
    const result = buildShortcutInvocation(EXE, DEST, LNK);
    assert.strictEqual(result.env.CODEX_TARGET_PATH,   EXE);
    assert.strictEqual(result.env.CODEX_WORKING_DIR,   DEST);
    assert.strictEqual(result.env.CODEX_SHORTCUT_PATH, LNK);
});

test('baseline: script uses $env: references, not interpolated values', () => {
    const result = buildShortcutInvocation(EXE, DEST, LNK);
    const script = getScript(result);
    assert.ok(!script.includes(EXE),  'exe path must not appear in script source');
    assert.ok(!script.includes(DEST), 'dest path must not appear in script source');
    assert.ok(!script.includes(LNK),  'lnk path must not appear in script source');
    assert.ok(script.includes('$env:CODEX_TARGET_PATH'),   'script must reference CODEX_TARGET_PATH via $env:');
    assert.ok(script.includes('$env:CODEX_WORKING_DIR'),   'script must reference CODEX_WORKING_DIR via $env:');
    assert.ok(script.includes('$env:CODEX_SHORTCUT_PATH'), 'script must reference CODEX_SHORTCUT_PATH via $env:');
});

test('single quote in path: raw value in env, script unchanged', () => {
    const evilExe = "C:\\Users\\o'reilly\\codex.exe";
    const result  = buildShortcutInvocation(evilExe, DEST, LNK);
    assert.strictEqual(result.env.CODEX_TARGET_PATH, evilExe);
    assert.ok(!getScript(result).includes(evilExe), 'single-quote path must not appear in script');
});

test('semicolon injection: raw value in env, script unchanged', () => {
    const evilDest = '; Write-Output INJECTED; #';
    const result   = buildShortcutInvocation(EXE, evilDest, LNK);
    assert.strictEqual(result.env.CODEX_WORKING_DIR, evilDest);
    assert.ok(!getScript(result).includes('INJECTED'), 'injected command must not appear in script');
});

test('hash comment injection: raw value in env, script unchanged', () => {
    const evilLnk = 'C:\\path#comment\\link.lnk';
    const result  = buildShortcutInvocation(EXE, DEST, evilLnk);
    assert.strictEqual(result.env.CODEX_SHORTCUT_PATH, evilLnk);
    assert.ok(!getScript(result).includes('#comment'), 'hash comment must not appear in script');
});

test('spaces in path: raw value in env, script unchanged', () => {
    const spacyExe = 'C:\\Program Files\\My App\\app.exe';
    const result   = buildShortcutInvocation(spacyExe, DEST, LNK);
    assert.strictEqual(result.env.CODEX_TARGET_PATH, spacyExe);
    assert.ok(!getScript(result).includes(spacyExe), 'spacy path must not appear in script');
});

test('powershell flags include -NoProfile and -NonInteractive', () => {
    const result = buildShortcutInvocation(EXE, DEST, LNK);
    assert.ok(result.args.includes('-NoProfile'));
    assert.ok(result.args.includes('-NonInteractive'));
});

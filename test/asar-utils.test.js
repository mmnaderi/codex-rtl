import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as asar from '@electron/asar';
import {
    computeAsarHeaderHash,
    countUnpackedFiles,
    createPackOptionsFromHeader,
    getBackupPath,
    getMacInfoPlistPath,
    getUnpackedLayout,
    listUnpackedFiles,
    readArchiveManifest,
    resolveArchiveEntryPoint
} from '../bin/asar-utils.js';

function temporaryDirectory(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-rtl-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}

test('resolves the manifest-defined entry point and rejects traversal', t => {
    const root = temporaryDirectory(t);
    const buildDir = path.join(root, '.vite', 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    const entryPath = path.join(buildDir, 'early-bootstrap.js');
    fs.writeFileSync(entryPath, 'require("./bootstrap-hash.js");');

    assert.equal(
        resolveArchiveEntryPoint(root, { main: '.vite/build/early-bootstrap.js' }),
        entryPath
    );
    assert.throws(
        () => resolveArchiveEntryPoint(root, { main: '../outside.js' }),
        /Unsafe ASAR main entry point/
    );
});

test('collapses fully unpacked trees without swallowing packed siblings', () => {
    const header = {
        files: {
            native: {
                files: {
                    'addon.node': { unpacked: true, size: 1 },
                    helper: { files: { tool: { unpacked: true, size: 1 } } }
                }
            },
            mixed: {
                files: {
                    'package.json': { size: 1 },
                    build: { files: { 'addon.node': { unpacked: true, size: 1 } } }
                }
            }
        }
    };

    const layout = getUnpackedLayout(header);
    assert.deepEqual(layout.directories, ['native', 'mixed/build']);
    assert.deepEqual(layout.files, []);
    assert.equal(layout.count, 3);
});

test('repacking preserves unpacked metadata and exposes a stable header hash', async t => {
    const root = temporaryDirectory(t);
    const source = path.join(root, 'source');
    const firstAsar = path.join(root, 'first.asar');
    const extracted = path.join(root, 'extracted');
    const secondAsar = path.join(root, 'second.asar');

    fs.mkdirSync(path.join(source, '.vite', 'build'), { recursive: true });
    fs.mkdirSync(path.join(source, 'native', 'runtime'), { recursive: true });
    fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({
        name: 'openai-codex-electron',
        version: '26.707.31428',
        codexBuildNumber: '5059',
        codexAppBrand: 'chatgpt',
        main: '.vite/build/early-bootstrap.js'
    }));
    fs.writeFileSync(path.join(source, '.vite', 'build', 'early-bootstrap.js'), 'require("./bootstrap-hash.js");');
    fs.writeFileSync(path.join(source, 'native', 'runtime', 'addon.node'), 'native');
    fs.writeFileSync(path.join(source, 'packed.txt'), 'packed');

    await asar.createPackageWithOptions(source, firstAsar, { unpackDir: 'native' });
    assert.equal(countUnpackedFiles(firstAsar), 1);
    assert.equal(readArchiveManifest(firstAsar).main, '.vite/build/early-bootstrap.js');

    const { options, layout } = createPackOptionsFromHeader(asar.getRawHeader(firstAsar).header);
    assert.equal(layout.count, 1);
    asar.extractAll(firstAsar, extracted);
    await asar.createPackageWithOptions(extracted, secondAsar, options);

    assert.equal(countUnpackedFiles(secondAsar), 1);
    assert.deepEqual(listUnpackedFiles(secondAsar), ['native/runtime/addon.node']);
    assert.match(computeAsarHeaderHash(secondAsar), /^[a-f0-9]{64}$/);
});

test('uses a versioned backup outside the application bundle', () => {
    const backupPath = getBackupPath('/Applications/ChatGPT.app/Contents/Resources/app.asar', {
        name: 'openai-codex-electron',
        version: '26.707.31428',
        codexBuildNumber: '5059',
        codexAppBrand: 'chatgpt'
    }, '/Users/tester');

    assert.equal(
        backupPath,
        '/Users/tester/.codex-rtl/backups/openai-codex-electron-chatgpt/26.707.31428-5059/app.asar'
    );
    assert.ok(!backupPath.startsWith('/Applications/ChatGPT.app/'));
});

test('recognizes a macOS Info.plist next to Resources/app.asar', t => {
    const root = temporaryDirectory(t);
    const contents = path.join(root, 'ChatGPT.app', 'Contents');
    const resources = path.join(contents, 'Resources');
    fs.mkdirSync(resources, { recursive: true });
    fs.writeFileSync(path.join(contents, 'Info.plist'), 'fixture');

    assert.equal(
        getMacInfoPlistPath(path.join(resources, 'app.asar')),
        path.join(contents, 'Info.plist')
    );
    assert.equal(getMacInfoPlistPath(path.join(root, 'app.asar')), null);
});

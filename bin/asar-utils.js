import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as asar from '@electron/asar';

export function readArchiveManifest(asarPath) {
    const manifest = JSON.parse(asar.extractFile(asarPath, 'package.json').toString('utf8'));
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('Invalid package.json in ASAR.');
    }
    return manifest;
}

export function resolveArchiveEntryPoint(extractDir, manifest) {
    if (typeof manifest.main !== 'string' || manifest.main.trim() === '') {
        throw new Error('ASAR package.json does not define a valid main entry point.');
    }

    const root = path.resolve(extractDir);
    const entryPath = path.resolve(root, manifest.main);
    const relative = path.relative(root, entryPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Unsafe ASAR main entry point: ${manifest.main}`);
    }
    if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) {
        throw new Error(`${manifest.main} not found in ASAR. Unsupported app version.`);
    }
    return entryPath;
}

export function computeAsarHeaderHash(asarPath) {
    const { headerString } = asar.getRawHeader(asarPath);
    return crypto.createHash('sha256').update(headerString).digest('hex');
}

function summarizeNode(node) {
    if (!node.files) {
        if (node.link) return { packed: 0, unpacked: 0 };
        return node.unpacked
            ? { packed: 0, unpacked: 1 }
            : { packed: 1, unpacked: 0 };
    }

    let packed = 0;
    let unpacked = 0;
    for (const child of Object.values(node.files)) {
        const summary = summarizeNode(child);
        packed += summary.packed;
        unpacked += summary.unpacked;
    }
    return { packed, unpacked };
}

export function getUnpackedLayout(header) {
    const root = header?.files ?? header;
    if (!root || typeof root !== 'object') {
        throw new Error('Invalid ASAR header.');
    }

    const directories = [];
    const files = [];

    const walk = (nodes, parent = '') => {
        for (const [name, node] of Object.entries(nodes)) {
            const relativePath = parent ? `${parent}/${name}` : name;
            if (node.files) {
                const summary = summarizeNode(node);
                if (summary.unpacked > 0 && summary.packed === 0) {
                    directories.push(relativePath);
                } else {
                    walk(node.files, relativePath);
                }
            } else if (node.unpacked) {
                files.push(relativePath);
            }
        }
    };

    walk(root);
    return {
        directories,
        files,
        count: directories.reduce((total, directory) => {
            const parts = directory.split('/');
            let node = { files: root };
            for (const part of parts) node = node.files[part];
            return total + summarizeNode(node).unpacked;
        }, files.length)
    };
}

function escapeGlobPath(value) {
    return value.replace(/([*?\[\]{}(),!+])/g, '\\$1');
}

function combineGlobPatterns(patterns) {
    if (patterns.length === 0) return undefined;
    if (patterns.length === 1) return patterns[0];
    return `{${patterns.join(',')}}`;
}

export function createPackOptionsFromHeader(header) {
    const layout = getUnpackedLayout(header);
    const unpackDir = combineGlobPatterns(layout.directories.map(escapeGlobPath));
    const unpack = combineGlobPatterns(
        layout.files.map(file => `**/${escapeGlobPath(file)}`)
    );
    return {
        layout,
        options: {
            ...(unpackDir ? { unpackDir } : {}),
            ...(unpack ? { unpack } : {})
        }
    };
}

export function countUnpackedFiles(asarPath) {
    return getUnpackedLayout(asar.getRawHeader(asarPath).header).count;
}

export function listUnpackedFilesFromHeader(header) {
    const root = header?.files ?? header;
    const files = [];
    const walk = (nodes, parent = '') => {
        for (const [name, node] of Object.entries(nodes)) {
            const relativePath = parent ? `${parent}/${name}` : name;
            if (node.files) walk(node.files, relativePath);
            else if (node.unpacked) files.push(relativePath);
        }
    };
    walk(root);
    return files.sort();
}

export function listUnpackedFiles(asarPath) {
    return listUnpackedFilesFromHeader(asar.getRawHeader(asarPath).header);
}

export function getMacInfoPlistPath(asarPath) {
    const resourcesDir = path.dirname(path.resolve(asarPath));
    const contentsDir = path.dirname(resourcesDir);
    if (path.basename(resourcesDir) !== 'Resources' || path.basename(contentsDir) !== 'Contents') {
        return null;
    }
    const infoPlist = path.join(contentsDir, 'Info.plist');
    return fs.existsSync(infoPlist) ? infoPlist : null;
}

function safePathSegment(value, fallback) {
    const segment = String(value ?? '')
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return segment || fallback;
}

export function getBackupPath(asarPath, manifest, homeDir = os.homedir()) {
    const appName = safePathSegment(manifest.name, 'codex');
    const brand = safePathSegment(manifest.codexAppBrand, 'codex');
    const version = safePathSegment(manifest.version, 'unknown-version');
    const build = safePathSegment(manifest.codexBuildNumber, 'unknown-build');
    return path.join(
        homeDir,
        '.codex-rtl',
        'backups',
        `${appName}-${brand}`,
        `${version}-${build}`,
        'app.asar'
    );
}

export function manifestsMatch(first, second) {
    return first?.name === second?.name &&
        first?.version === second?.version &&
        String(first?.codexBuildNumber ?? '') === String(second?.codexBuildNumber ?? '');
}

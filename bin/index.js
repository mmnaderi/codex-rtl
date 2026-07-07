#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import picocolors from 'picocolors';
import ora from 'ora';
import prompts from 'prompts';
import * as asar from '@electron/asar';
import { execSync } from 'child_process';
import figlet from 'figlet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { blue, cyan, green, red, yellow, bold } = picocolors;

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function printBanner() {
    try {
        const fullArt = figlet.textSync('Codex RTL', { font: 'RubiFont' }).split('\n');

        // Hex colors for the multi-color gradient
        const hexColors = [
            '#3126FF',
            '#5770FF',
            '#6F94FF',
            '#7081FF',
            '#BBA3FF',
            '#C1C3FF'
        ];

        // Parse hex to RGB
        const colors = hexColors.map(hex => {
            const bigint = parseInt(hex.replace('#', ''), 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255
            };
        });

        const applyGradient = (text) => {
            let result = '';
            const len = text.length;
            for (let i = 0; i < len; i++) {
                const char = text[i];
                if (char === ' ' || char === '\n') {
                    result += char;
                    continue;
                }
                const factor = len > 1 ? i / (len - 1) : 0;
                
                // Find current segment in the multi-color transition
                const segments = colors.length - 1;
                const segmentFloat = factor * segments;
                const segmentIdx = Math.min(Math.floor(segmentFloat), segments - 1);
                const segmentFactor = segmentFloat - segmentIdx;

                const cStart = colors[segmentIdx];
                const cEnd = colors[segmentIdx + 1];

                const r = Math.round(cStart.r + segmentFactor * (cEnd.r - cStart.r));
                const g = Math.round(cStart.g + segmentFactor * (cEnd.g - cStart.g));
                const b = Math.round(cStart.b + segmentFactor * (cEnd.b - cStart.b));

                result += `\x1b[38;2;${r};${g};${b}m${char}\x1b[0m`;
            }
            return result;
        };

        console.log('');
        for (const line of fullArt) {
            if (!line.trim()) continue;
            console.log(applyGradient(line));
        }
        console.log('');
        console.log(`\x1b[2m  RTL & UI Patcher for Codex | ${pkg.version}\x1b[0m\n`);
    } catch (err) {
        // Fallback banner in case figlet has issues loading
        console.log(bold(cyan(`\n✨ Codex Smart RTL Patcher v${pkg.version}\n`)));
    }
}

printBanner();

function handleMacPermissionError(err) {
    if (os.platform() === 'darwin') {
        console.error(yellow('\nOn macOS, you can either:'));
        console.error(yellow('  1. Grant your terminal "App Management" permission to run without sudo.'));
        console.error(yellow('  2. Or, run this command with sudo (e.g. sudo npx codex-rtl)'));
        console.log(blue('\nOpening System Settings directly to App Management for you...'));
        try {
            execSync('open "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AppBundles"');
            console.log(green('✔ Settings opened! Please enable the toggle for your terminal, then try again.\n'));
        } catch (e) {
            console.error(yellow('To open manually, go to: System Settings > Privacy & Security > App Management\n'));
        }
    }
}

function getDefaultPath() {
    if (os.platform() === 'darwin') {
        return '/Applications/Codex.app/Contents/Resources/app.asar';
    } else if (os.platform() === 'win32') {
        return path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Codex', 'resources', 'app.asar');
    } else {
        return '/opt/Codex/resources/app.asar';
    }
}

function getStorePath() {
    if (os.platform() !== 'win32') return null;
    try {
        const stdout = execSync(
            'powershell -Command "Get-AppxPackage *Codex* | Select-Object -ExpandProperty InstallLocation"',
            { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }
        );
        const installDir = stdout.toString().trim();
        if (installDir) {
            const possiblePaths = [
                path.join(installDir, 'app', 'resources', 'app.asar'),
                path.join(installDir, 'resources', 'app.asar')
            ];
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
        }
    } catch (e) {
        // PowerShell command failed or package not found
    }
    return null;
}

function makeWritableRecursively(dir) {
    if (!fs.existsSync(dir)) return;
    try {
        const stats = fs.statSync(dir);
        if (stats.isDirectory()) {
            fs.chmodSync(dir, 0o777);
            const files = fs.readdirSync(dir);
            for (const file of files) {
                makeWritableRecursively(path.join(dir, file));
            }
        } else {
            fs.chmodSync(dir, 0o666);
        }
    } catch (e) {
        // Ignore permission errors if files cannot be modified
    }
}

function findExecutable(dir) {
    if (!fs.existsSync(dir)) return null;
    try {
        const files = fs.readdirSync(dir);
        // 1. Look for Codex.exe (case-insensitive)
        const codexExe = files.find(f => f.toLowerCase() === 'codex.exe');
        if (codexExe) return path.join(dir, codexExe);
        
        // 2. Look for any other .exe files, ignoring common helpers
        const exes = files.filter(f => {
            const name = f.toLowerCase();
            return name.endsWith('.exe') && 
                   !name.includes('helper') && 
                   !name.includes('uninstall') && 
                   !name.includes('elevate');
        });
        if (exes.length > 0) {
            return path.join(dir, exes[0]);
        }
        
        // 3. Fallback to any .exe
        const anyExe = files.find(f => f.toLowerCase().endsWith('.exe'));
        return anyExe ? path.join(dir, anyExe) : null;
    } catch (e) {
        return null;
    }
}

function createWindowsShortcut(exePath, destDir) {
    try {
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const shortcutPath = path.join(desktopPath, 'Codex (Patched).lnk');
        
        // Normalize paths for Windows shells
        const normShortcutPath = shortcutPath.replace(/\//g, '\\');
        const normExePath = exePath.replace(/\//g, '\\');
        const normDestDir = destDir.replace(/\//g, '\\');

        const script = `$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('${normShortcutPath}'); $Shortcut.TargetPath = '${normExePath}'; $Shortcut.WorkingDirectory = '${normDestDir}'; $Shortcut.Save();`;
        // Escape single quotes for PowerShell
        const escapedScript = script.replace(/'/g, "''");
        
        execSync(`powershell -Command "${escapedScript}"`, { stdio: 'ignore' });
        return shortcutPath;
    } catch (e) {
        return null;
    }
}

async function getAsarPath() {
    let asarPath = getDefaultPath();
    if (fs.existsSync(asarPath)) {
        console.log(blue(`ℹ Found Codex installation at:`));
        console.log(`  ${asarPath}\n`);
        return { path: asarPath, isStore: false };
    }

    const storePath = getStorePath();
    if (storePath) {
        console.log(blue(`ℹ Found Microsoft Store Codex installation at:`));
        console.log(`  ${storePath}\n`);
        return { path: storePath, isStore: true };
    }

    console.log(yellow(`⚠ Could not find Codex at default location.`));
    const response = await prompts({
        type: 'text',
        name: 'customPath',
        message: 'Please enter the full path to app.asar:'
    });

    if (!response.customPath || !fs.existsSync(response.customPath)) {
        console.error(red('\n✖ Invalid path. Aborting.\n'));
        process.exit(1);
    }
    
    const isStore = response.customPath.toLowerCase().includes('windowsapps');
    return { path: response.customPath, isStore };
}

const args = process.argv.slice(2);
const isRestore = args.includes('--restore');

async function main() {
    let { path: asarPath, isStore } = await getAsarPath();
    let workingAsarPath = asarPath;
    let backupPath = asarPath + '.bak';
    
    if (isRestore) {
        if (isStore) {
            const storeDestDir = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Codex-Patched');
            const shortcutPath = path.join(os.homedir(), 'Desktop', 'Codex (Patched).lnk');
            const spinner = ora('Removing patched Codex copy...').start();
            try {
                if (fs.existsSync(storeDestDir)) {
                    fs.rmSync(storeDestDir, { recursive: true, force: true });
                }
                if (fs.existsSync(shortcutPath)) {
                    fs.rmSync(shortcutPath, { force: true });
                }
                spinner.succeed('Successfully removed patched Codex copy!\n');
                process.exit(0);
            } catch (e) {
                spinner.fail('Failed to remove patched copy.');
                console.error(red(e.message));
                process.exit(1);
            }
        } else {
            if (!fs.existsSync(backupPath)) {
                console.error(red('✖ No backup found to restore.\n'));
                process.exit(1);
            }
            const spinner = ora('Restoring original app.asar...').start();
            try {
                fs.copyFileSync(backupPath, asarPath);
                spinner.succeed('Successfully restored original Codex!\n');
                process.exit(0);
            } catch (e) {
                spinner.fail('Failed to restore.');
                console.error(red(e.message));
                handleMacPermissionError(e);
                process.exit(1);
            }
        }
    }

    if (isStore) {
        console.log(cyan('ℹ Microsoft Store version detected. Working on a local copy to bypass WindowsApps restrictions...'));
        const storeDestDir = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Codex-Patched');
        const appDir = path.dirname(path.dirname(asarPath));
        
        const copySpinner = ora('Copying Codex to user directory (this may take a few seconds)...').start();
        try {
            if (fs.existsSync(storeDestDir)) {
                fs.rmSync(storeDestDir, { recursive: true, force: true });
            }
            fs.mkdirSync(storeDestDir, { recursive: true });
            if (typeof fs.cpSync === 'function') {
                fs.cpSync(appDir, storeDestDir, { recursive: true });
            } else {
                execSync(`xcopy "${appDir}" "${storeDestDir}" /E /I /H /Y`, { stdio: 'ignore' });
            }
            
            // Remove read-only attributes from the copied files
            makeWritableRecursively(storeDestDir);
            
            copySpinner.succeed('Codex application files successfully copied to user directory.');
            
            workingAsarPath = path.join(storeDestDir, 'resources', 'app.asar');
            backupPath = workingAsarPath + '.bak';
        } catch (e) {
            copySpinner.fail('Failed to copy application files.');
            console.error(red(e.message));
            process.exit(1);
        }
    }

    const spinner = ora('Checking permissions and backing up...').start();
    try {
        fs.accessSync(path.dirname(workingAsarPath), fs.constants.W_OK);
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(workingAsarPath, backupPath);
        }
    } catch (e) {
        spinner.fail('Permission Denied.');
        console.error(red('\nSystem Error: ' + e.message));
        if (os.platform() === 'win32') {
            console.error(yellow('\nPlease run your terminal (PowerShell/CMD) as Administrator and try again.\n'));
        } else if (os.platform() === 'darwin') {
            handleMacPermissionError(e);
        } else {
            console.error(yellow('\nPlease run this command with sudo.\n'));
        }
        process.exit(1);
    }
    
    const extractDir = path.join(path.dirname(workingAsarPath), 'app-extracted-codex-rtl-temp');
    spinner.text = 'Extracting app.asar (this may take a few seconds)...';
    try {
        if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true, force: true });
        }
        asar.extractAll(workingAsarPath, extractDir);
    } catch (e) {
        spinner.fail('Failed to extract ASAR.');
        console.error(red(e.message));
        if (e.code === 'ENOENT' && !fs.existsSync(workingAsarPath + '.unpacked')) {
            console.error(yellow('\nTip: This ASAR file requires a ".unpacked" folder next to it.'));
            console.error(yellow('Make sure to copy "app.asar.unpacked" along with "app.asar".\n'));
        }
        process.exit(1);
    }

    spinner.text = 'Injecting RTL features and enabling DevTools...';
    try {
        const buildDir = path.join(extractDir, '.vite', 'build');
        if (!fs.existsSync(buildDir)) {
            throw new Error('.vite/build not found in ASAR. Unsupported Codex version.');
        }

        // 1. Find main-*.js
        const files = fs.readdirSync(buildDir);
        const mainFiles = files.filter(f => f.startsWith('main-') && f.endsWith('.js'));
        
        for (const mainFile of mainFiles) {
            const mainJsPath = path.join(buildDir, mainFile);
            let mainCode = fs.readFileSync(mainJsPath, 'utf8');
            
            // Force devTools: true
            const devtoolsRegex = /devTools:\s*this\.options\.allowDevtools/g;
            if (devtoolsRegex.test(mainCode)) {
                mainCode = mainCode.replace(devtoolsRegex, 'devTools:true');
                fs.writeFileSync(mainJsPath, mainCode, 'utf8');
            }
        }

        // 2. Inject RTL Loader into bootstrap.js
        const bootstrapPath = path.join(buildDir, 'bootstrap.js');
        if (!fs.existsSync(bootstrapPath)) {
            throw new Error('.vite/build/bootstrap.js not found in ASAR. Unsupported Codex version.');
        }

        let bootstrapCode = fs.readFileSync(bootstrapPath, 'utf8');
        
        if (bootstrapCode.includes('/* CODEX RTL PATCH START */')) {
            spinner.succeed('Codex is already patched!');
            fs.rmSync(extractDir, { recursive: true, force: true });
            console.log(green('\n✨ Enjoy your RTL experience!\n'));
            process.exit(0);
        }

        const loaderCode = `
/* CODEX RTL PATCH START */
try {
    const { app } = require('electron');
    app.on('browser-window-created', (event, win) => {
        // DevTools Shortcut Handler (F12, Cmd+Option+I, Ctrl+Shift+I)
        win.webContents.on('before-input-event', (ev, input) => {
            const isShortcut = input.key === 'F12' || 
                (input.control && input.shift && input.key.toLowerCase() === 'i') || 
                (input.meta && input.alt && input.key.toLowerCase() === 'i');
            if (isShortcut && input.type === 'keyDown') {
                try {
                    win.webContents.toggleDevTools();
                    ev.preventDefault();
                } catch (e) {}
            }
        });

        win.webContents.on('console-message', (ev, level, message) => {
            if (typeof message === 'string' && message.startsWith('SAVE_RTL_CONFIG|')) {
                try {
                    const data = message.substring(16);
                    const configPath = require('path').join(require('os').homedir(), '.codex-rtl.json');
                    require('fs').writeFileSync(configPath, data);
                } catch (e) {}
            }
        });
        
        win.webContents.on('dom-ready', () => {
            try {
                const title = win.getTitle() || '';
                if (title.startsWith('Pet Surface') || title === 'Dictation') return;
                if (!win.isResizable() || (typeof win.isFocusable === 'function' && !win.isFocusable())) {
                    return;
                }
                
                const path = require('path');
                const fs = require('fs');
                const fontPath = path.join(__dirname, 'Vazirmatn-Variable.woff2');
                const payloadPath = path.join(__dirname, 'payload.js');
                if (!fs.existsSync(fontPath) || !fs.existsSync(payloadPath)) return;
                
                const fontBase64 = fs.readFileSync(fontPath).toString('base64');
                let payload = fs.readFileSync(payloadPath, 'utf8');
                
                // Read config
                let rtlConfig = { faFont: '', enFont: '', codeFont: '', lh: '1.6', isRTL: true, forceRTL: false, fixAtSign: true };
                try {
                    const configPath = path.join(require('os').homedir(), '.codex-rtl.json');
                    if (fs.existsSync(configPath)) {
                        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        rtlConfig = { ...rtlConfig, ...cfg };
                    }
                } catch (e) {}

                // Replace placeholders in payload
                payload = payload.replace('__FONT_BASE64__', fontBase64);
                payload = payload.replace('__RTL_CONFIG__', JSON.stringify(rtlConfig));

                win.webContents.executeJavaScript(payload).catch(err => console.error("Failed to inject RTL:", err));
            } catch (e) {
                console.error("Failed to read RTL patch assets:", e);
            }
        });
    });
} catch(e) {
    console.error("RTL patch initialization failed:", e);
}
/* CODEX RTL PATCH END */
`;

        // Append loader to bootstrap.js
        bootstrapCode += '\n' + loaderCode;
        fs.writeFileSync(bootstrapPath, bootstrapCode, 'utf8');

        // 3. Copy font file
        const fontSource = path.join(__dirname, 'Vazirmatn-Variable.woff2');
        const fontDest = path.join(buildDir, 'Vazirmatn-Variable.woff2');
        if (fs.existsSync(fontSource)) {
            fs.copyFileSync(fontSource, fontDest);
        }

        // 4. Copy payload file
        const payloadSource = path.join(__dirname, 'payload.js');
        const payloadDest = path.join(buildDir, 'payload.js');
        if (fs.existsSync(payloadSource)) {
            fs.copyFileSync(payloadSource, payloadDest);
        }

    } catch (e) {
        spinner.fail('Injection failed.');
        console.error(red(e.message));
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
        process.exit(1);
    }

    spinner.text = 'Repacking app.asar (almost done)...';
    try {
        await asar.createPackage(extractDir, workingAsarPath);
        fs.rmSync(extractDir, { recursive: true, force: true });
        spinner.succeed('Successfully patched Codex!');
        
        if (isStore) {
            const storeDestDir = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Codex-Patched');
            const exePath = findExecutable(storeDestDir);
            if (exePath) {
                const shortcutPath = createWindowsShortcut(exePath, storeDestDir);
                if (shortcutPath) {
                    console.log(green(`✔ Created a desktop shortcut at: ${shortcutPath}`));
                }
                console.log(green(`\n✨ Patched Codex is ready! You can run it from:`));
                console.log(cyan(`  ${exePath}\n`));
            } else {
                console.log(green(`\n✨ Patched Codex is ready in:`));
                console.log(cyan(`  ${storeDestDir}\n`));
            }
        } else {
            console.log(green('\n✨ RTL Features and DevTools have been enabled. Please restart Codex to see the changes.\n'));
        }
    } catch (e) {
        spinner.fail('Failed to repack ASAR.');
        console.error(red(e.message));
        process.exit(1);
    }
}

main().catch(e => {
    console.error(red('\n✖ An unexpected error occurred:'), e.message);
    process.exit(1);
});

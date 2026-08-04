const STATIC_SCRIPT = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($env:CODEX_SHORTCUT_PATH)
$Shortcut.TargetPath = $env:CODEX_TARGET_PATH
$Shortcut.WorkingDirectory = $env:CODEX_WORKING_DIR
$Shortcut.Save()
`.trim();

function normWin(p) {
    return p.replace(/\//g, '\\');
}

function buildShortcutInvocation(exePath, destDir, shortcutPath) {
    return {
        args: ['-NoProfile', '-NonInteractive', '-Command', STATIC_SCRIPT],
        env: {
            ...process.env,
            CODEX_SHORTCUT_PATH: normWin(shortcutPath),
            CODEX_TARGET_PATH: normWin(exePath),
            CODEX_WORKING_DIR: normWin(destDir),
        },
    };
}

module.exports = { buildShortcutInvocation };

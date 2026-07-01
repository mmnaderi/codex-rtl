# Codex Knowledge Base & Documentation

This file documents technical insights, findings, and architectural details discovered while developing the Codex Smart RTL patcher.

## Codex Application Structure

Codex is an Electron-based desktop application. Its packaged code inside `app.asar` is structured as follows:

*   **Entry Point:** `.vite/build/bootstrap.js` (defined as `"main"` in `package.json`). This file bootstraps the application and starts the main process.
*   **Main JS Bundle:** `.vite/build/main-CE4LBHPy.js`. Contains window management, app lifecycle event handling, and features orchestration.
*   **Frontend Assets:** Located under `/webview/`. The main file is `/webview/index.html`, which loads the React/Vite client application bundle from `/webview/assets/`.

---

## Developer Settings & Features Activation

By default, Codex disables DevTools, Inspect Element, and the Debug Menu in production builds (`"codexBuildFlavor": "prod"`). These are controlled by the following variables in `.vite/build/main-CE4LBHPy.js`:

*   `m` / `allowDevtools`: Controls if Developer Tools can be opened.
*   `h` / `allowInspectElement`: Controls if right-clicking allows "Inspect Element".
*   `g` / `allowDebugMenu`: Controls if the top menu bar contains debug options.

### Patcher Strategy (DevTools activation)
To activate these features in the production build:
1. Extract `app.asar`.
2. Locate the initialization line in `.vite/build/main-CE4LBHPy.js`:
   `m=n.i.allowDevtools(i),h=i===n.i.Dev||i===n.i.Agent,g=n.i.allowDebugMenu(i)`
3. Replace it with:
   `m=true,h=true,g=true`
4. Repack `app.asar`.

---

## RTL Injection Strategy

For injecting RTL styles and controls:
*   We hook into Electron's global `browser-window-created` event.
*   By appending this event hook to the end of `.vite/build/bootstrap.js`, we ensure that any window created by the app gets the custom console and CSS/JS payload injected automatically on the `dom-ready` event.

---

## Codex UI Design Components (Tokens)

These are references to the native UI elements, tokens, and layouts used inside Codex, which we use to design the Codex RTL widget settings panel.

### Toggle Switch (Unchecked)
```html
<div class="flex shrink-0 items-center gap-2">
  <span data-state="closed" class="contents">
    <button type="button" role="switch" aria-checked="false" aria-label="Toggle Computer Use" class="inline-flex items-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-token-focus-border focus-visible:rounded-full cursor-interaction" data-state="unchecked">
      <span class="relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-out bg-token-foreground/10 h-5 w-8" data-state="unchecked">
        <span class="rounded-full border border-[color:var(--gray-0)] bg-[color:var(--gray-0)] shadow-sm transition-transform duration-200 ease-out data-[state=unchecked]:translate-x-0 h-4 w-4 data-[state=unchecked]:translate-x-[2px] data-[state=checked]:translate-x-[14px]" data-state="unchecked"></span>
      </span>
    </button>
  </span>
</div>
```

### Toggle Switch (Checked)
```html
<div class="flex shrink-0 items-center gap-2">
  <span data-state="closed" class="contents">
    <button type="button" role="switch" aria-checked="true" aria-label="Toggle Computer Use" class="inline-flex items-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-token-focus-border focus-visible:rounded-full cursor-interaction" data-state="checked">
      <span class="relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-out bg-token-charts-blue h-5 w-8" data-state="checked">
        <span class="rounded-full border border-[color:var(--gray-0)] bg-[color:var(--gray-0)] shadow-sm transition-transform duration-200 ease-out data-[state=unchecked]:translate-x-0 h-4 w-4 data-[state=unchecked]:translate-x-[2px] data-[state=checked]:translate-x-[14px]" data-state="checked"></span>
      </span>
    </button>
  </span>
</div>
```

### Target Settings Panel Layout (300px width)
```html
<div data-pip-obstacle="thread-summary-panel" class="flex max-h-full min-h-0 flex-col pointer-events-auto" style="width: 300px;">
  <div class="relative flex max-h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-token-dropdown-background pt-3 electron:elevation-prominent extension:border extension:border-token-border-default extension:shadow-md">
    <div class="flex h-fit max-h-full min-h-0 flex-col gap-3 overflow-y-auto pb-3">
      <section class="relative z-0 flex flex-col pb-3 after:absolute after:inset-x-4 after:bottom-0 after:h-[0.5px] after:bg-token-border-default after:content-[''] last:pb-0 last:after:hidden">
        <header class="sticky top-0 z-10 flex h-7 w-full min-w-0 items-center justify-start gap-2 bg-token-dropdown-background ps-4 pe-2.5 pb-0.5 text-base text-token-text-tertiary">
          <button aria-expanded="true" class="group/section-toggle inline-flex min-w-0 shrink-0 cursor-interaction items-center gap-1.5 rounded-md py-0.5 pr-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2" type="button">
            <span class="truncate">Outputs</span>
            <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="icon-2xs shrink-0 group-hover/section-toggle:opacity-100 group-focus-visible/section-toggle:opacity-100 transition-transform opacity-0 rotate-0">
              <path d="M15.2793 7.71101C15.539 7.45131 15.961 7.45131 16.2207 7.71101C16.4804 7.97071 16.4804 8.39272 16.2207 8.65242L10.4707 14.4024C10.211 14.6621 9.78902 14.6621 9.52932 14.4024L3.77932 8.65242L3.69436 8.54792C3.52385 8.28979 3.55205 7.93828 3.77932 7.71101C4.00659 7.48374 4.3581 7.45554 4.61623 7.62605L4.72073 7.71101L10 12.9903L15.2793 7.71101Z" fill="currentColor" stroke="currentColor" stroke-width="0.6"></path>
            </svg>
          </button>
        </header>
        <div class="relative z-0 overflow-hidden" style="height: auto; opacity: 1; margin-top: 2px;">
          <div class="flex flex-col gap-0.5 px-4">
            <div class="py-1 text-base text-token-description-foreground">No artifacts yet</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</div>
```

## Roadmap & Future Tasks

- [ ] **Verify Theme Sync Completeness**: Investigate other dimensions of Codex theme synchronization (e.g., text box border colors, focus states, background elements in light/dark transitions) to ensure all facets of the widget panel scale dynamically with any changes in the main application.

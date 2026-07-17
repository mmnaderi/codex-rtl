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

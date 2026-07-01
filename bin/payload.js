const fontBase64 = '__FONT_BASE64__';
const rtlConfig = __RTL_CONFIG__;

let isRTL = rtlConfig.isRTL !== false;
let forceRTL = rtlConfig.forceRTL === true;
let fixAtSign = rtlConfig.fixAtSign !== false;
let savedFaFont = rtlConfig.faFont || '';
let savedEnFont = rtlConfig.enFont || '';
let savedCodeFont = rtlConfig.codeFont || '';
let savedLH = rtlConfig.lh || '1.6';

if (!document.getElementById('rtl-widget-style')) {
    let widgetStyle = document.createElement('style');
    widgetStyle.id = 'rtl-widget-style';
    widgetStyle.innerHTML = `
        .rtl-widget-container {
            position: fixed;
            bottom: 16px;
            right: 16px;
            z-index: 99999;
            direction: ltr;
            font-family: inherit;
        }
        .rtl-widget-trigger {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            background-color: var(--scrollbar-thumb, #555);
            color: #fff;
            cursor: pointer;
            opacity: 0.8;
            transition: all 0.3s ease-in-out;
        }
        .rtl-widget-trigger:hover {
            transform: scale(1.1);
            opacity: 1;
        }
        .rtl-widget-container:hover .rtl-widget-trigger {
            opacity: 0;
            transform: scale(0.5);
            pointer-events: none;
        }
        .rtl-widget-panel {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 270px;
            transform: scale(0);
            transform-origin: bottom right;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s ease-in-out;
        }
        .rtl-widget-container:hover .rtl-widget-panel {
            transform: scale(1);
            opacity: 1;
            pointer-events: auto;
        }
        .rtl-tooltip {
            visibility: hidden;
            opacity: 0;
            transition: opacity 0.15s ease-in-out;
            pointer-events: none;
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
            width: 200px;
            padding: 8px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            z-index: 999999 !important;
            white-space: normal;
            text-align: center;
            background-color: #202123 !important;
            background-color: light-dark(#ffffff, #202123) !important;
            border: 1px solid #4d4d4d !important;
            border: 1px solid light-dark(#e5e7eb, #4d4d4d) !important;
            color: var(--color-token-foreground, #fff) !important;
            font-size: 11px;
            line-height: 1.4;
        }
        .rtl-tooltip::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-width: 5px;
            border-style: solid;
            border-color: #4d4d4d transparent transparent transparent !important;
            border-color: light-dark(#e5e7eb, #4d4d4d) transparent transparent transparent !important;
        }
        .rtl-info-icon {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            opacity: 0.5;
            transition: opacity 0.15s ease-in-out;
        }
        .rtl-info-icon:hover {
            opacity: 1;
        }
        .rtl-info-icon:hover .rtl-tooltip {
            visibility: visible;
            opacity: 1;
        }
        .rtl-github-link {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
            opacity: 0.7;
            text-decoration: none;
            padding-top: 4px;
            padding-bottom: 2px;
            transition: all 0.15s ease-in-out;
            color: var(--color-token-foreground, #fff) !important;
        }
        .rtl-github-link:hover {
            opacity: 1;
            color: #ffd700 !important; /* Gold color */
        }
    `;
    document.head.appendChild(widgetStyle);
}

const rtlStyle = document.createElement('style');
rtlStyle.id = 'codex-rtl-style';

const updateDynamicCSS = () => {
    if (!isRTL) {
        if (rtlStyle.parentNode) rtlStyle.parentNode.removeChild(rtlStyle);
        return;
    }
    
    let faFontRule = '';
    let faFontName = "'PersianOnlyFont'";
    
    if (savedFaFont) {
        faFontName = "'UserPersianFont', 'PersianOnlyFont'";
        let baseFaFont = savedFaFont.replace(/[-\s]?Regular$/i, '');
        faFontRule = `
            @font-face {
                font-family: 'UserPersianFont';
                src: local('${savedFaFont}'), local('${baseFaFont}');
                font-weight: 400;
                unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
            }
            @font-face {
                font-family: 'UserPersianFont';
                src: local('${baseFaFont} Bold'), local('${baseFaFont}-Bold'), local('${baseFaFont}Bold');
                font-weight: 700;
                unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
            }
        `;
    }
    
    let enFontStr = savedEnFont ? `'${savedEnFont}', ui-sans-serif, system-ui, sans-serif` : 'ui-sans-serif, system-ui, sans-serif';
    let codeFontStr = savedCodeFont ? `'${savedCodeFont}', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    
    let forceRtlStyle = forceRTL ? `
        /* Force RTL layout for all text components excluding the widget panel */
        p:not(.rtl-widget-container *), 
        li:not(.rtl-widget-container *), 
        h1:not(.rtl-widget-container *), 
        h2:not(.rtl-widget-container *), 
        h3:not(.rtl-widget-container *), 
        h4:not(.rtl-widget-container *), 
        h5:not(.rtl-widget-container *), 
        h6:not(.rtl-widget-container *),
        textarea:not(.rtl-widget-container *), 
        [contenteditable="true"]:not(.rtl-widget-container *), 
        [contenteditable="true"] p:not(.rtl-widget-container *),
        [data-lexical-text="true"]:not(.rtl-widget-container *) {
            direction: rtl !important;
            text-align: right !important;
            unicode-bidi: isolate !important;
        }
    ` : '';
    
    rtlStyle.textContent = `
        ${faFontRule}
        @font-face {
            font-family: 'PersianOnlyFont';
            src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
            font-weight: 100 900;
            unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        
        :root, :host, html, body {
            font-family: ${faFontName}, ${enFontStr}, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" !important;
            --diffs-font-family: ${codeFontStr} !important;
            --diffs-font-fallback: ${codeFontStr} !important;
        }
        
        /* Smart RTL using CSS unicode-bidi plaintext */
        p, h1, h2, h3, h4, h5, h6, li, span, div, [role="presentation"] {
            unicode-bidi: plaintext !important;
            text-align: start !important;
        }
        
        /* Explicitly keep our widget panel LTR and left-aligned */
        .rtl-widget-container, .rtl-widget-container * {
            direction: ltr !important;
            text-align: left !important;
            unicode-bidi: isolate !important;
        }
        
        /* Force RTL rules if enabled */
        ${forceRtlStyle}
        
        /* Ensure code blocks are kept LTR and get the code font applied */
        pre:not(.rtl-widget-container *), 
        code:not(.rtl-widget-container *), 
        pre:not(.rtl-widget-container *) *, 
        code:not(.rtl-widget-container *) *,
        pre:not(.rtl-widget-container *) span,
        code:not(.rtl-widget-container *) span,
        [data-line] span {
            unicode-bidi: isolate !important;
            direction: ltr !important;
            text-align: left !important;
            font-family: ${codeFontStr} !important;
        }
        
        /* Text input fields and lexical text editors */
        textarea:not(.rtl-widget-container *), 
        [contenteditable="true"]:not(.rtl-widget-container *), 
        [contenteditable="true"] p:not(.rtl-widget-container *), 
        [data-lexical-text="true"]:not(.rtl-widget-container *) {
            unicode-bidi: plaintext !important;
            text-align: start !important;
        }
        
        /* Adjust list padding when elements render as RTL */
        ul:not(#_)[dir="rtl"], ol:not(#_)[dir="rtl"],
        [dir="rtl"] ul:not(#_), [dir="rtl"] ol:not(#_) {
            padding-left: 0 !important;
            padding-right: 1.25rem !important;
        }
        
        /* Custom Line Height */
        p:not(.rtl-widget-container *), 
        li:not(.rtl-widget-container *), 
        h1:not(.rtl-widget-container *), 
        h2:not(.rtl-widget-container *), 
        h3:not(.rtl-widget-container *), 
        [contenteditable="true"] p:not(.rtl-widget-container *),
        [data-lexical-text="true"]:not(.rtl-widget-container *) {
            line-height: ${savedLH} !important;
        }
    `;
    
    if (!rtlStyle.parentNode) {
        document.head.appendChild(rtlStyle);
    }
};

// Initial apply
updateDynamicCSS();

// Global Shift+2 keyboard handler for @
document.addEventListener('keydown', (e) => {
    if (!fixAtSign) return;
    if (e.code === 'Digit2' && e.shiftKey) {
        if (e.key === '٬' || e.key === '،') {
            e.preventDefault();
            document.execCommand('insertText', false, '@');
        }
    }
}, { capture: true });

// Floating widget for Codex RTL
const widgetWrapper = document.createElement('div');
widgetWrapper.className = 'rtl-widget-container';
widgetWrapper.innerHTML = `
      <div class="rtl-widget-trigger">
        <svg height="20" width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      </div>
      
      <div class="rtl-widget-panel">
        <div class="relative flex max-h-full min-h-0 flex-col rounded-3xl bg-token-dropdown-background pt-3 border border-token-border-default shadow-md">
          <div class="flex flex-col gap-2 px-3 pb-3 pt-0 w-full h-full" style="display: flex; flex-direction: column; gap: 8px;">
          
            <div class="border-b border-token-border-default pb-2 mb-1 text-center" style="text-align: center !important;">
                <div class="electron:heading-lg heading-base truncate text-center" style="color: var(--color-token-foreground); text-align: center;">Codex Smart RTL</div>
            </div>
            
            <div class="flex items-center justify-between gap-4 px-1" style="display: flex; justify-content: space-between; align-items: center;">
              <span id="rtl-toggle-label" class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">${isRTL ? 'Enabled' : 'Disabled'}</span>
              <button id="rtl-toggle-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${isRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                <span id="rtl-toggle-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${isRTL ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
              </button>
            </div>
            
            <div id="rtl-settings-wrapper" class="flex flex-col gap-2 transition-all duration-300" style="position: relative; z-index: 10; opacity: ${isRTL ? '1' : '0.4'}; pointer-events: ${isRTL ? 'auto' : 'none'}; display: flex; flex-direction: column; gap: 8px; transition: opacity 0.3s;">
                <div class="flex items-center justify-between gap-2 px-1 mt-1" style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span class="font-medium text-xs" style="font-size: 12px; color: var(--color-token-foreground);">Force RTL</span>
                    <div class="rtl-info-icon" style="color: var(--color-token-foreground); cursor: pointer; margin-left: 2px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M450-290h60V-520H450v230Zm52.92-307.75q9.38-9.29 9.38-23.02t-9.29-23.02T480-653.07t-23.02,9.29t-9.29,23.02t9.38,23.02T480-588.46t22.92-9.29ZM480.07-100q-78.84,0-148.2-29.92T211.18-211.13T129.93-331.76T100-479.93t29.92-148.2t81.21-120.68t120.63-81.25T479.93-860t148.2,29.92t120.68,81.21t81.25,120.63T860-480.07t-29.92,148.2T748.87-211.18T628.24-129.93T480.07-100ZM480-160q134,0 227-93t93-227T707-707T480-800T253-707T160-480t93,227t227,93Zm0-320Z"></path></svg>
                      <div class="rtl-tooltip">Forces RTL layout on all elements, even if the text starts with English characters.</div>
                    </div>
                  </div>
                  <button id="rtl-force-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${forceRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                    <span id="rtl-force-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${forceRTL ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
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
                  <button id="rtl-at-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${fixAtSign ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                    <span id="rtl-at-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${fixAtSign ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
                  </button>
                </div>
                
                <div class="h-px bg-token-border-default w-full"></div>
                
                <!-- GitHub -->
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

const toggleBtn = document.getElementById('rtl-toggle-btn');
const toggleKnob = document.getElementById('rtl-toggle-knob');
const toggleLabel = document.getElementById('rtl-toggle-label');
const settingsWrapper = document.getElementById('rtl-settings-wrapper');
const forceBtn = document.getElementById('rtl-force-btn');
const forceKnob = document.getElementById('rtl-force-knob');
const atBtn = document.getElementById('rtl-at-btn');
const atKnob = document.getElementById('rtl-at-knob');
const faFontInput = document.getElementById('rtl-fafont-input');
const enFontInput = document.getElementById('rtl-enfont-input');
const codeFontInput = document.getElementById('rtl-codefont-input');
const lhInput = document.getElementById('rtl-lh-input');
const lhResetBtn = document.getElementById('rtl-lh-reset');

const saveConfig = () => {
    console.log("SAVE_RTL_CONFIG|" + JSON.stringify({
        isRTL: isRTL,
        forceRTL: forceRTL,
        fixAtSign: fixAtSign,
        faFont: faFontInput.value.trim(),
        enFont: enFontInput.value.trim(),
        codeFont: codeFontInput.value.trim(),
        lh: lhInput.value
    }));
};

toggleBtn.addEventListener('click', () => {
    isRTL = !isRTL;
    saveConfig();
    toggleLabel.innerText = isRTL ? 'Enabled' : 'Disabled';
    settingsWrapper.style.opacity = isRTL ? '1' : '0.4';
    settingsWrapper.style.pointerEvents = isRTL ? 'auto' : 'none';
    toggleKnob.style.transform = isRTL ? 'translateX(20px)' : 'translateX(0)';
    toggleBtn.style.backgroundColor = isRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555';
    updateDynamicCSS();
});

forceBtn.addEventListener('click', () => {
    forceRTL = !forceRTL;
    saveConfig();
    forceKnob.style.transform = forceRTL ? 'translateX(20px)' : 'translateX(0)';
    forceBtn.style.backgroundColor = forceRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555';
    updateDynamicCSS();
});

atBtn.addEventListener('click', () => {
    fixAtSign = !fixAtSign;
    saveConfig();
    atKnob.style.transform = fixAtSign ? 'translateX(20px)' : 'translateX(0)';
    atBtn.style.backgroundColor = fixAtSign ? 'var(--color-token-charts-blue, #339cff)' : '#555';
});

faFontInput.addEventListener('input', () => {
    savedFaFont = faFontInput.value.trim();
    saveConfig();
    updateDynamicCSS();
});

enFontInput.addEventListener('input', () => {
    savedEnFont = enFontInput.value.trim();
    saveConfig();
    updateDynamicCSS();
});

codeFontInput.addEventListener('input', () => {
    savedCodeFont = codeFontInput.value.trim();
    saveConfig();
    updateDynamicCSS();
});

lhInput.addEventListener('input', () => {
    savedLH = lhInput.value;
    saveConfig();
    updateDynamicCSS();
});

lhResetBtn.addEventListener('click', () => {
    lhInput.value = '1.6';
    savedLH = '1.6';
    saveConfig();
    updateDynamicCSS();
});

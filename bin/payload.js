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
            display: flex;
            flex-direction: column;
            padding: 1px;
            border-radius: 16px;
            width: 240px;
            background: var(--main-surface-primary, #202123);
            border: 1px solid var(--border-medium, #4d4d4d);
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            color: var(--text-primary, #fff);
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
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        }
        .rtl-info-icon:hover .rtl-tooltip {
            visibility: visible;
            opacity: 1;
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
        <div class="flex flex-col gap-2 p-3 w-full h-full" style="display: flex; flex-direction: column; gap: 8px;">
        
        <div style="text-align: center !important; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 4px;">
            <span class="text-sm font-semibold" style="font-size: 14px; font-weight: 600;">Codex Smart RTL</span>
        </div>
        
        <div class="flex items-center justify-between gap-4 px-1" style="display: flex; justify-content: space-between; align-items: center;">
          <span id="rtl-toggle-label" class="font-medium text-xs opacity-80" style="font-size: 12px;">${isRTL ? 'Enabled' : 'Disabled'}</span>
          <button id="rtl-toggle-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${isRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
            <span id="rtl-toggle-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${isRTL ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
          </button>
        </div>
        
        <div id="rtl-settings-wrapper" class="flex flex-col gap-2 transition-all duration-300" style="opacity: ${isRTL ? '1' : '0.4'}; pointer-events: ${isRTL ? 'auto' : 'none'}; display: flex; flex-direction: column; gap: 8px; transition: opacity 0.3s;">
            <div class="flex items-center justify-between gap-2 px-1 mt-1" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Force RTL</span>
              <button id="rtl-force-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${forceRTL ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                <span id="rtl-force-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${forceRTL ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
              </button>
            </div>
            
            <div style="height: 1px; background: rgba(255,255,255,0.1); width: 100%;"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">FA/AR Font</span>
              <input id="rtl-fafont-input" type="text" placeholder="Default: Vazirmatn" value="${savedFaFont}" style="font-size: 11px; background: var(--input-background, #3e3f4b); border: 1px solid var(--border-medium, #4d4d4d); color: #fff; padding: 4px 8px; border-radius: 4px; width: 110px; border: 1px solid #555; outline: none;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">EN Font</span>
              <input id="rtl-enfont-input" type="text" placeholder="Default: System" value="${savedEnFont}" style="font-size: 11px; background: var(--input-background, #3e3f4b); border: 1px solid var(--border-medium, #4d4d4d); color: #fff; padding: 4px 8px; border-radius: 4px; width: 110px; border: 1px solid #555; outline: none;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Code Font</span>
              <input id="rtl-codefont-input" type="text" placeholder="Default: System" value="${savedCodeFont}" style="font-size: 11px; background: var(--input-background, #3e3f4b); border: 1px solid var(--border-medium, #4d4d4d); color: #fff; padding: 4px 8px; border-radius: 4px; width: 110px; border: 1px solid #555; outline: none;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Line Height</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input id="rtl-lh-input" type="range" min="1.2" max="2.5" step="0.1" value="${savedLH}" style="width: 80px; cursor: pointer;">
                <button id="rtl-lh-reset" type="button" style="background: none; border: none; color: #fff; opacity: 0.5; cursor: pointer; font-size: 14px;">↺</button>
              </div>
            </div>
            
            <div style="height: 1px; background: rgba(255,255,255,0.1); width: 100%;"></div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Shift+2 fixes @</span>
              <button id="rtl-at-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${fixAtSign ? 'var(--color-token-charts-blue, #339cff)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                <span id="rtl-at-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${fixAtSign ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
              </button>
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

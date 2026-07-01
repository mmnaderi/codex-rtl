const fontBase64 = '__FONT_BASE64__';
const rtlConfig = __RTL_CONFIG__;

let isRTL = rtlConfig.isRTL !== false;
let forceRTL = rtlConfig.forceRTL === true;

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
            font-family: system-ui, -apple-system, sans-serif;
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
    
    let forceRtlStyle = forceRTL ? `
        /* Override smart plaintext RTL and force RTL layout for chat content */
        .prose p, .prose li, .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6,
        [data-testid="chat-message"] p, [data-testid="chat-message"] li,
        [data-testid="chat-message"] h1, [data-testid="chat-message"] h2, [data-testid="chat-message"] h3,
        [data-testid="chat-message"] .leading-relaxed, .leading-relaxed,
        [data-testid="user-input-step"] p, [data-testid="user-input-step"] li,
        .markdown p, .markdown li, .markdown h1, .markdown h2, .markdown h3 {
            direction: rtl !important;
            text-align: right !important;
            unicode-bidi: isolate !important;
        }
    ` : '';
    
    rtlStyle.textContent = `
        @font-face {
            font-family: 'PersianOnlyFont';
            src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
            font-weight: 100 900;
            unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        :root, :host, html, body {
            font-family: 'PersianOnlyFont', ui-sans-serif, system-ui, -apple-system, sans-serif !important;
        }
        
        /* Smart RTL using CSS unicode-bidi plaintext */
        p, h1, h2, h3, h4, h5, h6, li, span, div, [role="presentation"] {
            unicode-bidi: plaintext !important;
            text-align: start !important;
        }
        
        /* Force RTL rules if enabled (has higher specificity) */
        ${forceRtlStyle}
        
        /* Ensure code blocks are kept LTR */
        pre, code, pre *, code * {
            unicode-bidi: isolate !important;
            direction: ltr !important;
            text-align: left !important;
        }
        
        /* Text input fields and lexical text editors */
        textarea, [contenteditable="true"], [contenteditable="true"] p, [data-lexical-text="true"] {
            unicode-bidi: plaintext !important;
            text-align: start !important;
        }
        
        /* Adjust list padding when elements render as RTL */
        ul:not(#_)[dir="rtl"], ol:not(#_)[dir="rtl"],
        [dir="rtl"] ul:not(#_), [dir="rtl"] ol:not(#_) {
            padding-left: 0 !important;
            padding-right: 1.25rem !important;
        }
    `;
    
    if (!rtlStyle.parentNode) {
        document.head.appendChild(rtlStyle);
    }
};

// Initial apply
updateDynamicCSS();

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
          <button id="rtl-toggle-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${isRTL ? 'var(--button-primary, #10a37f)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
            <span id="rtl-toggle-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${isRTL ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
          </button>
        </div>
        
        <div id="rtl-settings-wrapper" class="flex flex-col gap-2 transition-all duration-300" style="opacity: ${isRTL ? '1' : '0.4'}; pointer-events: ${isRTL ? 'auto' : 'none'}; display: flex; flex-direction: column; gap: 8px; transition: opacity 0.3s;">
            <div class="flex items-center justify-between gap-2 px-1 mt-1" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Force RTL</span>
              <button id="rtl-force-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: ${forceRTL ? 'var(--button-primary, #10a37f)' : '#555'}; border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                <span id="rtl-force-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: ${forceRTL ? 'translateX(20px)' : 'translateX(0)'}; transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
              </button>
            </div>
            
            <div style="height: 1px; background: rgba(255,255,255,0.1); width: 100%;"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">FA/AR Font</span>
              <input id="rtl-fafont-input" type="text" placeholder="Default: Vazirmatn" disabled value="" style="font-size: 11px; background: var(--input-background, #3e3f4b); border: 1px solid var(--border-medium, #4d4d4d); color: #fff; padding: 4px 8px; border-radius: 4px; width: 110px; opacity: 0.5;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">EN Font</span>
              <input id="rtl-enfont-input" type="text" placeholder="Default: System" disabled value="" style="font-size: 11px; background: var(--input-background, #3e3f4b); border: 1px solid var(--border-medium, #4d4d4d); color: #fff; padding: 4px 8px; border-radius: 4px; width: 110px; opacity: 0.5;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Code Font</span>
              <input id="rtl-codefont-input" type="text" placeholder="Default: System" disabled value="" style="font-size: 11px; background: var(--input-background, #3e3f4b); border: 1px solid var(--border-medium, #4d4d4d); color: #fff; padding: 4px 8px; border-radius: 4px; width: 110px; opacity: 0.5;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Line Height</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input id="rtl-lh-input" type="range" min="1.2" max="2.5" step="0.1" disabled value="1.6" style="width: 80px; cursor: pointer; opacity: 0.5;">
                <button id="rtl-lh-reset" type="button" disabled style="background: none; border: none; color: #fff; opacity: 0.2; cursor: pointer;">↺</button>
              </div>
            </div>
            
            <div style="height: 1px; background: rgba(255,255,255,0.1); width: 100%;"></div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span class="font-medium text-xs opacity-80" style="font-size: 12px;">Shift+2 fixes @</span>
              <button id="rtl-at-btn" type="button" class="relative inline-flex items-center rounded-full transition-colors duration-200 h-6 w-11" style="background-color: var(--button-primary, #10a37f); border: none; cursor: pointer; height: 24px; width: 44px; border-radius: 9999px; position: relative;">
                <span id="rtl-at-knob" class="inline-block transform rounded-full bg-white transition-transform h-4 w-4" style="margin-left: 4px; transform: translateX(20px); transition: transform 0.2s; height: 16px; width: 16px; border-radius: 9999px; background: #fff; display: block;"></span>
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

const saveConfig = () => {
    console.log("SAVE_RTL_CONFIG|" + JSON.stringify({
        isRTL: isRTL,
        forceRTL: forceRTL
    }));
};

toggleBtn.addEventListener('click', () => {
    isRTL = !isRTL;
    saveConfig();
    toggleLabel.innerText = isRTL ? 'Enabled' : 'Disabled';
    settingsWrapper.style.opacity = isRTL ? '1' : '0.4';
    settingsWrapper.style.pointerEvents = isRTL ? 'auto' : 'none';
    toggleKnob.style.transform = isRTL ? 'translateX(20px)' : 'translateX(0)';
    toggleBtn.style.backgroundColor = isRTL ? 'var(--button-primary, #10a37f)' : '#555';
    updateDynamicCSS();
});

forceBtn.addEventListener('click', () => {
    forceRTL = !forceRTL;
    saveConfig();
    forceKnob.style.transform = forceRTL ? 'translateX(20px)' : 'translateX(0)';
    forceBtn.style.backgroundColor = forceRTL ? 'var(--button-primary, #10a37f)' : '#555';
    updateDynamicCSS();
});

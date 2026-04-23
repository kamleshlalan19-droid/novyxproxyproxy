// Settings Management
class SettingsManager {
    constructor() {
        this.themes = [
            { id: 'mocha', title: 'Mocha' },
            { id: 'macchiato', title: 'Macchiato' },
            { id: 'frappe', title: 'Frappe' },
            { id: 'latte', title: 'Latte' },
            { id: 'nord', title: 'Nord' },
            { id: 'rose-pine', title: 'Rose Pine' },
            { id: 'moss', title: 'Moss' },
            { id: 'gruvbox', title: 'Gruvbox' },
            { id: 'night', title: 'Night' }
        ];
        this.init();
    }

    init() {
        // Load saved settings
        this.loadSettings();
        // Apply settings on page load
        this.applySettings();
        // Initialize panic system
        this.initPanicSystem();
        // Initialize settings modal
        this.initSettingsModal();
        // Initialize about:blank cloak - only on initial page load, not on navigation
        // Check sessionStorage FIRST to avoid any interference
        if (localStorage.getItem("aboutBlank") !== "true") {
            sessionStorage.removeItem("aboutBlankActivated");
        }
        const alreadyActivated = sessionStorage.getItem("aboutBlankActivated");
        const aboutBlankEnabled = localStorage.getItem("aboutBlank") === "true";
        console.log('[SettingsManager] Initializing, aboutBlankActivated:', alreadyActivated, 'aboutBlankEnabled:', aboutBlankEnabled);
        
        if (!alreadyActivated && aboutBlankEnabled) {
            // Only set up the listener if we haven't activated yet
            // Use a flag to prevent multiple initializations
            if (!this._aboutBlankInitStarted) {
                this._aboutBlankInitStarted = true;
                console.log('[SettingsManager] Setting up about:blank listener');
                
                if (document.readyState === 'complete') {
                    // Use a small delay to ensure navigation isn't in progress
                    setTimeout(() => {
                        this.initAboutBlank();
                    }, 50);
                } else {
                    window.addEventListener('load', () => {
                        // Small delay after load to ensure navigation completed
                        setTimeout(() => {
                            this.initAboutBlank();
                        }, 50);
                    }, { once: true });
                }
            }
        } else {
            if (alreadyActivated) {
                console.log('[SettingsManager] About:blank already activated, skipping initialization');
            } else if (!aboutBlankEnabled) {
                console.log('[SettingsManager] About:blank not enabled in settings');
            }
        }
        
        // Check if we're in an iframe (about:blank cloak) and set up link interception
        // This needs to run even if about:blank was already activated
        let inFrame;
        try {
            inFrame = window !== top;
        } catch (e) {
            inFrame = true;
        }
        
        if (inFrame && sessionStorage.getItem("aboutBlankActivated") === "true") {
            console.log('[SettingsManager] Detected iframe with about:blank activated, setting up link interception');
            this.initIframeLinkInterception();
        }
    }

    // Load settings from localStorage
    loadSettings() {
        this.settings = {
            theme: localStorage.getItem('@nano/theme') || 'mocha',
            customTitle: localStorage.getItem('settings_customTitle') || '',
            customFavicon: localStorage.getItem('settings_customFavicon') || '',
            panicKey: localStorage.getItem('settings_panicKey') || '`',
            panicUrl: localStorage.getItem('settings_panicUrl') || 'https://drive.google.com'
        };
    }

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem('@nano/theme', this.settings.theme);
        localStorage.setItem('settings_customTitle', this.settings.customTitle);
        localStorage.setItem('settings_customFavicon', this.settings.customFavicon);
        localStorage.setItem('settings_panicKey', this.settings.panicKey);
        localStorage.setItem('settings_panicUrl', this.settings.panicUrl);
    }

    // Apply settings to the page
    applySettings() {
        document.documentElement.dataset.theme = this.settings.theme;
        if (document.body) {
            document.body.dataset.theme = this.settings.theme;
        }

        // Apply custom title
        if (this.settings.customTitle) {
            document.title = this.settings.customTitle;
        }

        // Apply custom favicon
        if (this.settings.customFavicon) {
            let favicon = document.querySelector("link[rel='icon']");
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            favicon.href = this.settings.customFavicon;
        }
    }

    // Initialize panic system
    initPanicSystem() {
        // Remove existing listener if any
        if (this._panicHandler) {
            document.removeEventListener('keydown', this._panicHandler);
        }
        
        // Create new handler
        this._panicHandler = (e) => {
            // Check if the pressed key matches the panic key
            if (e.key === this.settings.panicKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Only trigger if not typing in an input/textarea
                if (document.activeElement.tagName !== 'INPUT' && 
                    document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    window.location.href = this.settings.panicUrl;
                }
            }
        };
        
        document.addEventListener('keydown', this._panicHandler);
    }

    // Initialize settings modal
    initSettingsModal() {
        // Create settings modal HTML
        this.createSettingsModal();
        
        // Bind other modal events
        this.bindSettingsEvents();
        
        // Also try binding after a short delay as fallback
        setTimeout(() => {
            this.bindSettingsEvents();
        }, 50);
    }

    // Bind settings button and modal events
    bindSettingsEvents() {
        const settingsModal = document.getElementById('settingsModal');
        const settingsClose = document.getElementById('settingsClose');
        const settingsForm = document.getElementById('settingsForm');

        if (settingsClose && !settingsClose.hasAttribute('data-bound')) {
            settingsClose.setAttribute('data-bound', 'true');
            settingsClose.addEventListener('click', () => {
                if (settingsModal) {
                    settingsModal.style.display = 'none';
                }
            });
        }

        // Close modal when clicking outside (only add once)
        if (settingsModal && !this._modalClickHandler) {
            this._modalClickHandler = (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                }
            };
            window.addEventListener('click', this._modalClickHandler);
        }

        if (settingsForm && !settingsForm.hasAttribute('data-bound')) {
            settingsForm.setAttribute('data-bound', 'true');
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettingsFromForm();
                if (settingsModal) {
                    settingsModal.style.display = 'none';
                }
            });
        }
    }

    // Create settings modal HTML
    createSettingsModal() {
        // Check if modal already exists
        if (document.getElementById('settingsModal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.className = 'modal';
        modal.style.display = 'none'; // Ensure modal is hidden by default
        modal.setAttribute('style', 'display: none;'); // Also set as attribute to ensure it's hidden
        modal.innerHTML = `
            <div class="modal-content settings-modal-content">
                <span class="close" id="settingsClose">&times;</span>
                <h2>Settings</h2>
                <form id="settingsForm">
                    <div class="settings-group">
                        <label for="siteTheme">Theme</label>
                        <select id="siteTheme" class="styled-select">
                            ${this.themes.map((theme) => `<option value="${theme.id}">${theme.title}</option>`).join('')}
                        </select>
                    </div>

                    <div class="settings-group">
                        <label for="customTitle">Page Title</label>
                        <input type="text" id="customTitle" placeholder="Leave empty for default">
                    </div>

                    <div class="settings-group">
                        <label for="customFavicon">Favicon URL</label>
                        <input type="url" id="customFavicon" placeholder="https://example.com/favicon.ico">
                    </div>

                    <div class="settings-group">
                        <label>
                            <input type="checkbox" id="aboutBlankCheck">
                            Enable about:blank cloak
                        </label>
                        <small>Redirects page to Google Drive lookalike in about:blank</small>
                    </div>

                    <div class="settings-group">
                        <label for="panicKey">Panic Key</label>
                        <input type="text" id="panicKey" maxlength="1" placeholder="\`">
                        <small>Press this key to navigate to panic URL (default: \`)</small>
                    </div>

                    <div class="settings-group">
                        <label for="panicUrl">Panic URL</label>
                        <input type="url" id="panicUrl" placeholder="https://drive.google.com">
                    </div>

                    <button type="submit" class="settings-save-btn">Save Settings</button>
                    <button type="button" class="settings-reset-btn" id="resetSettingsBtn">Reset to Defaults</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Ensure modal is hidden after appending (innerHTML might reset styles)
        modal.style.display = 'none';

        // Add reset button handler
        const resetBtn = document.getElementById('resetSettingsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all settings to defaults?')) {
                    this.resetSettings();
                    this.populateSettingsForm();
                }
            });
        }

        // Add about:blank checkbox handler
        const aboutBlankCheck = document.getElementById('aboutBlankCheck');
        if (aboutBlankCheck) {
            aboutBlankCheck.addEventListener('change', (e) => {
                localStorage.setItem('aboutBlank', e.target.checked ? 'true' : 'false');
                // Clear session flag when toggling
                sessionStorage.removeItem('aboutBlankActivated');
                if (e.target.checked) {
                    alert('About:blank cloak enabled. Reload the page to activate.');
                }
            });
        }
    }

    // Populate settings form with current values
    populateSettingsForm() {
        document.getElementById('siteTheme').value = this.settings.theme;
        document.getElementById('customTitle').value = this.settings.customTitle;
        document.getElementById('customFavicon').value = this.settings.customFavicon;
        document.getElementById('panicKey').value = this.settings.panicKey;
        document.getElementById('panicUrl').value = this.settings.panicUrl;
        const aboutBlankCheck = document.getElementById('aboutBlankCheck');
        if (aboutBlankCheck) {
            aboutBlankCheck.checked = localStorage.getItem('aboutBlank') === 'true';
        }
    }

    // Save settings from form
    saveSettingsFromForm() {
        this.settings.theme = document.getElementById('siteTheme').value || 'mocha';
        this.settings.customTitle = document.getElementById('customTitle').value.trim();
        this.settings.customFavicon = document.getElementById('customFavicon').value.trim();
        this.settings.panicKey = document.getElementById('panicKey').value || '`';
        this.settings.panicUrl = document.getElementById('panicUrl').value || 'https://drive.google.com';

        this.saveSettings();
        this.applySettings();
        
        // Reinitialize panic system with new key
        this.initPanicSystem();
        
        alert('Settings saved successfully!');
    }

    // Reset settings to defaults
    resetSettings() {
        this.settings = {
            theme: 'mocha',
            customTitle: '',
            customFavicon: '',
            panicKey: '`',
            panicUrl: 'https://drive.google.com',
            openInAboutBlank: false
        };
        localStorage.setItem('aboutBlank', 'false');
        sessionStorage.removeItem('aboutBlankActivated');
        this.saveSettings();
        this.applySettings();
    }

    // Intercept link clicks in iframe and manually navigate
    // This is needed because navigation in about:blank iframes can be blocked
    initIframeLinkInterception() {
        console.log('[About:Blank] Setting up iframe link interception for about:blank iframe');
        
        // Use capture phase and high priority to intercept before other handlers
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href) {
                console.log('[About:Blank] Link detected:', link.href, 'Current target:', e.target.tagName);
                
                // Skip hash links and javascript: links
                if (link.href === '#' || link.href.startsWith('javascript:')) {
                    return;
                }
                
                // Check if it's a same-origin link
                try {
                    const linkUrl = new URL(link.href, window.location.href);
                    const currentUrl = new URL(window.location.href);
                    
                    console.log('[About:Blank] Link origin:', linkUrl.origin, 'Current origin:', currentUrl.origin);
                    
                    // Only intercept same-origin links (internal navigation)
                    if (linkUrl.origin === currentUrl.origin) {
                        // Check if it's a new tab link
                        const isNewTab = link.target === '_blank' || 
                                        e.ctrlKey || 
                                        e.metaKey || 
                                        e.shiftKey;
                        
                        console.log('[About:Blank] Is new tab?', isNewTab);
                        
                        if (!isNewTab) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            
                            console.log('[About:Blank] Intercepting link click in iframe:', link.href);
                            console.log('[About:Blank] Manually navigating to:', link.href);
                            
                            // In about:blank iframes, we can't directly change window.location.href
                            // We need to update the iframe's src from the parent window
                            try {
                                // Try to access parent window and update iframe src
                                if (window.parent && window.parent !== window) {
                                    const parentDoc = window.parent.document;
                                    const iframes = parentDoc.getElementsByTagName('iframe');
                                    
                                    // Find the iframe that contains this window
                                    for (let i = 0; i < iframes.length; i++) {
                                        try {
                                            if (iframes[i].contentWindow === window) {
                                                console.log('[About:Blank] Found parent iframe, updating src');
                                                iframes[i].src = link.href;
                                                return; // Success
                                            }
                                        } catch (err) {
                                            // Cross-origin check failed, try next iframe
                                            continue;
                                        }
                                    }
                                    
                                    // If we couldn't find it by contentWindow, try by comparing URLs
                                    for (let i = 0; i < iframes.length; i++) {
                                        const iframeSrc = iframes[i].src;
                                        const currentUrl = window.location.href.split('?')[0]; // Remove query params
                                        if (iframeSrc && iframeSrc.includes(currentUrl)) {
                                            console.log('[About:Blank] Found parent iframe by URL match, updating src');
                                            iframes[i].src = link.href;
                                            return; // Success
                                        }
                                    }
                                }
                                
                                // Fallback: try direct navigation (may not work in about:blank)
                                console.log('[About:Blank] Fallback: trying window.location.href');
                                window.location.href = link.href;
                            } catch (err) {
                                console.error('[About:Blank] Navigation error:', err);
                                // Last resort: try location.replace
                                try {
                                    window.location.replace(link.href);
                                } catch (err2) {
                                    console.error('[About:Blank] All navigation methods failed:', err2);
                                }
                            }
                        }
                    } else {
                        console.log('[About:Blank] Different origin, allowing default behavior');
                    }
                } catch (err) {
                    console.error('[About:Blank] Error processing link:', err);
                }
            }
        }, true); // Use capture phase to intercept early
    }

    // Initialize about:blank cloak
    initAboutBlank() {
        // Double-check we haven't already started this
        if (this._aboutBlankRunning) {
            console.log('[About:Blank] Already running, aborting');
            return;
        }
        
        var blankerCheck = localStorage.getItem("aboutBlank");
        console.log('[About:Blank] Checking localStorage:', blankerCheck);
        
        if (blankerCheck === "true") {
            // Only run once per session to avoid interfering with navigation
            // Check this FIRST before doing anything else
            const alreadyActivated = sessionStorage.getItem("aboutBlankActivated");
            if (alreadyActivated) {
                console.log('[About:Blank] Already activated this session, skipping');
                return;
            }
            
            // Mark as running to prevent multiple executions
            this._aboutBlankRunning = true;
            
            let inFrame;
            try {
                inFrame = window !== top;
            } catch (e) {
                inFrame = true;
            }
            
            console.log('[About:Blank] inFrame check:', inFrame, 'window !== top:', window !== top);
            
            // If we're in a frame, we're already cloaked, don't run again
            if (inFrame) {
                console.log('[About:Blank] Already in frame, skipping - this is expected in the iframe');
                console.log('[About:Blank] Iframe URL:', window.location.href);
                // Make sure we're not blocking navigation in the iframe
                // Clear any flags that might interfere
                this._aboutBlankRunning = false;
                this._redirected = false;
                
                // Intercept link clicks in the iframe and manually update the iframe's src
                // This is necessary because navigation in about:blank iframes can be blocked
                this.initIframeLinkInterception();
                return;
            }
            
            if (!navigator.userAgent.includes("Firefox")) {
                console.log('[About:Blank] Activating cloak...');
                // Mark as activated IMMEDIATELY before doing anything else
                // This is critical to prevent re-running on navigation
                sessionStorage.setItem("aboutBlankActivated", "true");
                
                const popup = open("about:blank", "_blank");
                if (!popup || popup.closed) {
                    console.log('[About:Blank] Popup blocked');
                    alert("Please allow popups and redirects for about:blank cloak to work.");
                    sessionStorage.removeItem("aboutBlankActivated");
                    this._aboutBlankRunning = false;
                } else {
                    console.log('[About:Blank] Popup opened, setting up iframe');
                    const doc = popup.document;
                    const iframe = doc.createElement("iframe");
                    const style = iframe.style;
                    const link = doc.createElement("link");
                    
                    const name = "My Drive - Google Drive";
                    const icon = "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png";
                    
                    doc.title = name;
                    link.rel = "icon";
                    link.href = icon;
                    
                    // Add cache-busting parameter to ensure iframe loads fresh scripts
                    const iframeUrl = new URL(location.href);
                    iframeUrl.searchParams.set('_t', Date.now());
                    iframe.src = iframeUrl.toString();
                    
                    style.position = "fixed";
                    style.top = style.bottom = style.left = style.right = "0";
                    style.border = style.outline = "none";
                    style.width = style.height = "100%";
                    
                    doc.head.appendChild(link);
                    doc.body.appendChild(iframe);
                    
                    // Add beforeunload script to prevent accidental closing
                    const script = doc.createElement("script");
                    script.textContent = `
                        window.onbeforeunload = function (event) {
                            const confirmationMessage = 'Leave Site?';
                            (event || window.event).returnValue = confirmationMessage;
                            return confirmationMessage;
                        };
                    `;
                    doc.head.appendChild(script);
                    
                    // Get redirect URL from localStorage or use default
                    const pLink = localStorage.getItem(encodeURI("pLink")) || "https://www.google.com";
                    console.log('[About:Blank] Setting up redirect to:', pLink);
                    
                    // Redirect immediately - the iframe is already set up and loading
                    // We redirect the MAIN window (not the popup), so it won't interfere with iframe navigation
                    console.log('[About:Blank] Redirecting main window to:', pLink);
                    try {
                        // Use setTimeout to ensure iframe starts loading first
                        setTimeout(() => {
                            const currentUrl = document.location.href;
                            if (!currentUrl.includes('google.com') && !currentUrl.includes('drive.google.com')) {
                                console.log('[About:Blank] Executing redirect from main window to:', pLink);
                                location.replace(pLink);
                            } else {
                                console.log('[About:Blank] Already redirected, skipping');
                            }
                        }, 100);
                    } catch (e) {
                        console.error('[About:Blank] Redirect failed:', e);
                    }
                }
            } else {
                console.log('[About:Blank] Firefox detected, skipping');
                this._aboutBlankRunning = false;
            }
        } else {
            console.log('[About:Blank] Not enabled in localStorage');
        }
    }
}

// Set up click handler immediately - don't wait for page to load
(function() {
    // Set up event delegation immediately for settings button
    document.addEventListener('click', function settingsBtnHandler(e) {
        if (e.target.closest('#settingsBtn, [data-open-settings]')) {
            e.preventDefault();
            e.stopPropagation();
            
            // Make sure modal exists, create it if needed
            let settingsModal = document.getElementById('settingsModal');
            if (!settingsModal) {
                // Create modal on the fly if it doesn't exist yet
                settingsModal = document.createElement('div');
                settingsModal.id = 'settingsModal';
                settingsModal.className = 'modal';
                settingsModal.style.display = 'none';
                document.body.appendChild(settingsModal);
                
                // Initialize full settings manager if not already done
                if (!window.settingsManager) {
                    window.settingsManager = new SettingsManager();
                } else {
                    // Just create the modal HTML
                    window.settingsManager.createSettingsModal();
                }
                settingsModal = document.getElementById('settingsModal');
            }
            
            if (settingsModal) {
                settingsModal.style.display = 'block';
                if (window.settingsManager) {
                    window.settingsManager.populateSettingsForm();
                }
            }
        }
    }, true);
    
    // Debug: Log all link clicks to see what's happening
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href) {
            console.log('[Navigation Debug] Link clicked:', link.href, 'Target:', link.target);
            console.log('[Navigation Debug] Current URL:', window.location.href);
            console.log('[Navigation Debug] AboutBlank activated:', sessionStorage.getItem('aboutBlankActivated'));
            console.log('[Navigation Debug] In iframe:', window !== top);
            console.log('[Navigation Debug] Link will navigate to:', link.href);
            
            // Check if navigation is being prevented
            setTimeout(() => {
                console.log('[Navigation Debug] After click, URL is now:', window.location.href);
            }, 100);
        }
    }, true);
})();

// Initialize settings when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.settingsManager) {
            window.settingsManager = new SettingsManager();
        }
    });
} else {
    if (!window.settingsManager) {
        window.settingsManager = new SettingsManager();
    }
}


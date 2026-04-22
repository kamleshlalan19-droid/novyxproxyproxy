import Bing from "../icons/searchEngines/bing";
import Brave from "../icons/searchEngines/brave";
import DuckDuckGo from "../icons/searchEngines/duckduckgo";
import Google from "../icons/searchEngines/google";
import SearXNG from "../icons/searchEngines/searxng";
import Yahoo from "../icons/searchEngines/yahoo";

const Settings = function () {
    const themes = {
        mocha: { id: "mocha", title: "Mocha" },
        macchiato: { id: "macchiato", title: "Macchiato" },
        frappe: { id: "frappe", title: "Frappe" },
        latte: { id: "latte", title: "Latte" },
        nord: { id: "nord", title: "Nord" },
        "rose-pine": { id: "rose-pine", title: "Rose Pine" },
        moss: { id: "moss", title: "Moss" },
        gruvbox: { id: "gruvbox", title: "Gruvbox" },
        night: { id: "night", title: "Night" },
    };

    const searchEngines = {
        "https://www.google.com/search?q=%s": {
            id: "google",
            url: "https://www.google.com/search?q=%s",
            title: "Google",
            icon: Google,
        },
        "https://duckduckgo.com/?q=%s&ia=web": {
            id: "duckduckgo",
            url: "https://duckduckgo.com/?q=%s&ia=web",
            title: "DuckDuckGo",
            icon: DuckDuckGo,
        },
        "https://www.bing.com/search?q=%s": {
            id: "bing",
            url: "https://www.bing.com/search?q=%s",
            title: "Bing",
            icon: Bing,
        },
        "https://search.yahoo.com/search?p=%s": {
            id: "yahoo",
            url: "https://search.yahoo.com/search?p=%s",
            title: "Yahoo",
            icon: Yahoo,
        },
        "https://search.brave.com/search?q=%s": {
            id: "brave",
            url: "https://search.brave.com/search?q=%s",
            title: "Brave",
            icon: Brave,
        },
        "https://searx.si/search?q=%s": {
            id: "searxng",
            url: "https://searx.si/search?q=%s",
            title: "SearXNG",
            icon: SearXNG,
        },
    };

    const changeTheme = (newTheme) => {
        document.body.dataset.themeChanging = "true";
        setTimeout(() => {
            document.body.dataset.themeChanging = "false";
        }, 400);
        this.theme = newTheme;
    };

    return (
        <aside
            class="proxy-sidebar proxy-panel sidebar-scroll"
            class:sidebar-hidden={use(this.settingsActive, (settingsActive) => !settingsActive)}
        >
            <div class="proxy-settings-stack">
                <div class="proxy-sidebar-head">
                    <div>
                        <strong>Settings</strong>
                        <span>Theme and search</span>
                    </div>
                </div>

                <div class="proxy-settings-card">
                    <div class="proxy-settings-heading">
                        <h3>Search engine</h3>
                    </div>
                    <div class="proxy-engine-grid">
                        {Object.entries(searchEngines).map(([key, engine]) => {
                            const Icon = engine.icon;
                            return (
                                <button
                                    class="proxy-settings-btn"
                                    aria-label={engine.title}
                                    on:click={() => (this.searchEngine = key)}
                                    data-active={use(
                                        this.searchEngine,
                                        (searchEngine) =>
                                            String(searchEngine === key),
                                    )}
                                >
                                    <Icon class="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>
                    <input
                        placeholder="Search engine template (%s = query)"
                        class="proxy-field mt-3"
                        bind:value={use(this.searchEngine)}
                        on:input={(e) => (this.searchEngine = e.target.value)}
                    />
                </div>

                <div class="proxy-settings-card">
                    <div class="proxy-settings-heading">
                        <h3>Theme</h3>
                    </div>
                    <div class="proxy-swatches">
                        {Object.entries(themes).map((theme) => (
                            <button
                                class="proxy-settings-btn"
                                aria-label={theme[1].title}
                                title={theme[1].title}
                                on:click={() => changeTheme(theme[1].id)}
                                data-active={use(
                                    this.theme,
                                    (activeTheme) =>
                                        String(activeTheme === theme[1].id),
                                )}
                            >
                                <div
                                    class="w-5 h-5 rounded-full"
                                    style={
                                        "background: var(--theme-" +
                                        theme[1].id +
                                        ", var(--Blue));"
                                    }
                                ></div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Settings;

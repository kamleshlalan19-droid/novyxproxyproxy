import Sortable from "sortablejs";
import Plus from "../icons/plus";
import Minus from "../icons/minus";

const Tabs = function () {
    const tabHost = (url) => {
        try {
            return new URL(url).hostname.replace(/^www\./, "");
        } catch {
            return "New session";
        }
    };

    this.mount = () => {
        new Sortable(this.root.querySelector(".proxy-tab-list"), {
            forceFallback: true,
            animation: 200,
            direction: "vertical",
            dragClass: "dragging",
            filter: ".tab-close",
            onSort: (e) => {
                const movedItem = this.tabs.splice(e.oldIndex, 1)[0];
                this.tabs.splice(e.newIndex, 0, movedItem);
            },
            onChoose: (e) => {
                [...document.querySelectorAll(".proxy-tab")].forEach(
                    (tab) => (tab.dataset.current = "false"),
                );
                e.item.querySelector(".proxy-tab").dataset.current = "true";
                setCurrent(e.oldIndex);
            },
            onStart: () => {
                document.body.dataset.dragging = "true";
            },
            onEnd: () => {
                document.body.dataset.dragging = "false";
            },
        });
    };

    const setCurrent = (index) => {
        for (let tab of this.tabs) {
            if (tab.hasOwnProperty("iframe")) {
                tab.iframe.dataset.current = "false";
            }
        }

        this.current = index;
        if (this.tabs[this.current].hasOwnProperty("iframe")) {
            this.tabs[this.current].iframe.dataset.current = "true";
        }

        if (window.matchMedia("(max-width: 860px)").matches) {
            this.sidebar = false;
        }
    };

    return (
        <aside
            class="proxy-sidebar proxy-panel sidebar-scroll"
            class:sidebar-hidden={use(this.tabsActive, (tabsActive) => !tabsActive)}
        >
            <div class="proxy-sidebar-head">
                <div>
                    <strong>nano.</strong>
                    <span>{use(this.tabs, (tabs) => `${tabs.length} tab${tabs.length === 1 ? "" : "s"}`)}</span>
                </div>
                <button
                    on:click={() => this.newTab()}
                    aria-label="New Tab"
                    title="New Tab (Alt+T)"
                    class="proxy-command-btn proxy-sidebar-add"
                >
                    <Plus />
                </button>
            </div>

            <div class="proxy-favorites-card">
                <div class="proxy-section-head">
                    <strong>Favorites</strong>
                    <button
                        class="proxy-quick-launch-btn"
                        on:click={() => this.saveCurrentFavorite()}
                        disabled={use(this.currentHasURL, (currentHasURL) => !currentHasURL)}
                    >
                        Save current
                    </button>
                </div>
                <div class="proxy-favorites-list">
                    {use(this.favorites, (favorites) =>
                        favorites.length ? (
                            favorites.map((favorite) => (
                                <div class="proxy-favorite-row">
                                    <button
                                        class="proxy-favorite-link"
                                        on:click={() =>
                                            this.openFavorite(
                                                favorite.title,
                                                favorite.url,
                                            )}
                                    >
                                        <span class="proxy-favorite-title">
                                            {favorite.title}
                                        </span>
                                        <span class="proxy-favorite-meta">
                                            {tabHost(favorite.url)}
                                        </span>
                                    </button>
                                    <button
                                        class="proxy-command-btn proxy-tab-close tab-close"
                                        on:click={() =>
                                            this.removeFavorite(favorite.url)
                                        }
                                        aria-label={`Remove ${favorite.title}`}
                                    >
                                        <Minus />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p class="proxy-favorites-empty">
                                Save the current page here.
                            </p>
                        ),
                    )}
                </div>
            </div>

            <div class="proxy-tab-list sidebar-scroll">
                {use(this.tabs, (tabs) =>
                    tabs.map((tab, index) => (
                        <div class="proxy-tab-row">
                            <button
                                type="button"
                                on:click={() => setCurrent(index)}
                                on:nanoUpdateTitle={(e) =>
                                    (e.target.querySelector(
                                        ".proxy-tab-title",
                                    ).innerText = tab.title)
                                }
                                class="proxy-tab"
                                aria-label={"Tab #" + String(index)}
                                data-current={index == this.current}
                            >
                                <span class="proxy-tab-copy">
                                    <span class="proxy-tab-title">{tab.title}</span>
                                    <span class="proxy-tab-meta">
                                        {tab.url || tabHost(tab.url)}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                on:click={() => this.removeTab(index)}
                                aria-label={"Close tab #" + String(index)}
                                title="Close Tab (Alt+W)"
                                class="proxy-command-btn proxy-tab-close tab-close"
                            >
                                <Minus />
                            </button>
                        </div>
                    )),
                )}
            </div>
        </aside>
    );
};

export default Tabs;

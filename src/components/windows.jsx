const Windows = function () {
    window.addEventListener("chemicalLoaded", async () => {
        setTimeout(async () => {
            for (let tab of this.tabs) {
                if (
                    tab.hasOwnProperty("url") &&
                    !tab.hasOwnProperty("iframe")
                ) {
                    tab.iframe = await this.createIFrame(tab);
                }
            }
        }, 100);
    });

    return (
        <div
            bind:this={use(this.windows)}
            class="proxy-stage proxy-panel window-frame"
            class:stage-full={use(this.sidebar, (sidebar) => !sidebar)}
        >
            <div class="proxy-stage-topbar">
                <div class="proxy-stage-title">
                    {use(this.tabs, (tabs) =>
                        tabs[this.current]?.title || "New Tab",
                    )}
                </div>
                <div class="proxy-stage-status">
                    {use(
                        this.searchEngine,
                        (searchEngine) =>
                            searchEngine.includes("%s")
                                ? "Search enabled"
                                : "Direct mode",
                    )}
                </div>
            </div>
            <div class:hidden={use(this.currentHasURL)} class="window-empty">
                <div class="window-empty-simple">
                    <strong>New Tab</strong>
                    <p>Type a URL or search above.</p>
                </div>
            </div>
        </div>
    );
};

export default Windows;

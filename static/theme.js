(() => {
    const theme = localStorage.getItem("@nano/theme") || "mocha";
    const applyTheme = () => {
        document.documentElement.dataset.theme = theme;
        if (document.body) {
            document.body.dataset.theme = theme;
        }
    };

    applyTheme();
    document.addEventListener("DOMContentLoaded", applyTheme, { once: true });
})();

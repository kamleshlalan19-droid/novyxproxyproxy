import Head from "../components/head";

const Error = function () {
    this.theme = localStorage.getItem("@nano/theme") || "mocha";
    this.cloakTitle = localStorage.getItem("@nano/cloak/title") || "";
    this.cloakIcon = localStorage.getItem("@nano/cloak/icon") || "";

    return (
        <div class="error-shell">
            <Head
                bind:theme={use(this.theme)}
                bind:cloakTitle={use(this.cloakTitle)}
                bind:cloakIcon={use(this.cloakIcon)}
            />
            <div class="proxy-panel error-card">
                <h1>Route Not Found</h1>
                <p>
                    The requested page cannot be found. Head back to the proxy
                    shell and launch a new tab.
                </p>
                <div class="legal-nav justify-center">
                    <a class="legal-link" href="/proxe">Open proxy</a>
                    <a class="legal-link" href="/">Go home</a>
                </div>
            </div>
        </div>
    );
};

export default Error;

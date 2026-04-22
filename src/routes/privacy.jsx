import Head from "../components/head";

const Privacy = function () {
    this.theme = localStorage.getItem("@nano/theme") || "mocha";
    this.cloakTitle = localStorage.getItem("@nano/cloak/title") || "";
    this.cloakIcon = localStorage.getItem("@nano/cloak/icon") || "";
    this.updated = new Date(1722322385209);

    return (
        <div class="legal-page">
            <Head
                bind:theme={use(this.theme)}
                bind:cloakTitle={use(this.cloakTitle)}
                bind:cloakIcon={use(this.cloakIcon)}
            />
            <div class="legal-nav">
                <a class="legal-link" href="/proxe">Back to proxy</a>
                <a class="legal-link" href="/terms">Terms</a>
            </div>
            <article class="proxy-panel legal-card">
                <h1>Privacy Policy</h1>
                <p>
                    Effective Date:{" "}
                    {this.updated.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                </p>

                <h2>Introduction</h2>
                <p>
                    CanLite is built to keep your on-site preferences simple
                    and easy to manage. This page explains what the proxy keeps
                    on your device, what can happen on outside pages, and where
                    to reach us if you have a question.
                </p>

                <h2>On-Device Preferences</h2>
                <p>
                    Theme choices, saved favorites, and similar convenience
                    settings are primarily stored in your browser so the proxy
                    feels familiar when you come back.
                </p>

                <h2>How That Data Is Used</h2>
                <p>
                    Those settings are used to remember how you like the proxy
                    to look and behave. They are there to improve the
                    experience, not to turn the site into something you need to
                    reconfigure every time.
                </p>

                <h2>Cookies and Tracking</h2>
                <p>
                    CanLite does not aim to turn routine browsing preferences
                    into a detailed profile of you. Some integrated services or
                    third-party pages may still use their own tracking or
                    cookies once you are on their content.
                </p>

                <h2>Sharing</h2>
                <p>
                    CanLite does not exist to sell your on-site preferences or
                    hand them around. If you choose to use features that depend
                    on another service, that service may handle the information
                    required for the feature to work.
                </p>

                <h2>Third-Party Sites</h2>
                <p>
                    When you open a game, tool, or external page through the
                    proxy, that destination can follow its own privacy rules and
                    data practices. Those pages are outside our control, so it
                    is worth checking their policies if you rely on them often.
                </p>

                <h2>Data Security</h2>
                <p>
                    We work to keep the proxy stable and straightforward, but no
                    website can promise perfect privacy or perfect security
                    across the internet. Use the same caution here that you
                    would use anywhere else online.
                </p>

                <h2>Managing Your Settings</h2>
                <p>
                    If you want to clear local preferences such as saved
                    settings or favorites, you can manage that through your
                    browser storage controls.
                </p>

                <h2>Changes to This Page</h2>
                <p>
                    This page may change when the site changes. When it does,
                    the effective date above will be updated to reflect the
                    current version.
                </p>

                <h2>Contact Information</h2>
                <p>
                    For questions or concerns about this Privacy Policy, please
                    contact us at:{" "}
                    <a href="mailto:canlite24@outlook.com">
                        canlite24@outlook.com
                    </a>
                </p>
            </article>
        </div>
    );
};

export default Privacy;

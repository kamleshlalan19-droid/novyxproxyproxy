import Head from "../components/head";

const Terms = function () {
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
                <a class="legal-link" href="/privacy">Privacy</a>
            </div>
            <article class="proxy-panel legal-card">
                <h1>Terms of Service</h1>
                <p>
                    Effective Date:{" "}
                    {this.updated.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                </p>

                <h2>1. Acceptance of Terms</h2>
                <p>
                    By using CanLite, you agree to these Terms of Service. If
                    you do not agree, do not use our service.
                </p>

                <h2>2. Service Description</h2>
                <p>
                    CanLite provides a web-proxy service that allows users to
                    access web content anonymously.
                </p>

                <h2>3. User Responsibilities</h2>
                <ul>
                    <li>
                        <strong>Compliance:</strong> Use the service in
                        compliance with applicable laws and regulations.
                    </li>
                    <li>
                        <strong>Prohibited Use:</strong> Do not use the service
                        for illegal activities or to infringe on the rights of
                        others.
                    </li>
                </ul>

                <h2>4. No Warranty</h2>
                <p>
                    CanLite does not guarantee the service's availability,
                    accuracy, or reliability. We are not responsible for any
                    issues arising from third-party content accessed through the
                    service.
                </p>

                <h2>5. Limitation of Liability</h2>
                <p>
                    CanLite is not liable for any indirect, incidental, or
                    consequential damages resulting from the use of the service.
                </p>

                <h2>6. Third-Party Sites</h2>
                <p>
                    The service may provide access to third-party websites. We
                    are not responsible for the content or privacy practices of
                    these sites.
                </p>

                <h2>7. Changes to Terms</h2>
                <p>
                    We may update these Terms of Service periodically. Changes
                    will be effective immediately upon posting. Continued use of
                    the service signifies acceptance of the revised terms.
                </p>

                <h2>8. Termination</h2>
                <p>
                    We may suspend or terminate access to the service for any
                    user who violates these terms.
                </p>

                <h2>9. Contact Information</h2>
                <p>
                    For inquiries about these Terms of Service, please contact:{" "}
                    <a href="mailto:nebelung@mailfence.com">
                        nebelung@mailfence.com
                    </a>
                </p>
            </article>
        </div>
    );
};

export default Terms;

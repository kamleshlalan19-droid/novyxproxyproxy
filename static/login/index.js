// Panic System - Initialize early to catch all keypresses
(function() {
    const panicKey = localStorage.getItem('settings_panicKey') || '`';
    const panicUrl = localStorage.getItem('settings_panicUrl') || 'https://drive.google.com';

    document.addEventListener('keydown', function(e) {
        // Check if the pressed key matches the panic key
        if (e.key === panicKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Only trigger if not typing in an input/textarea
            if (document.activeElement.tagName !== 'INPUT' &&
                document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                window.location.href = panicUrl;
            }
        }
    });
})();

if (localStorage.getItem('token')) {
    let token = localStorage.getItem('token');

    fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
    })
        .then(res => res.json())
        .then(data => {

            if (!data.loggedIn) {
                localStorage.removeItem("token");
                return;
            }
            document.getElementById('loginModalBtn').innerHTML =
                `<span id="loginSpan" class="material-symbols-outlined">account_circle</span>My Account`;

            if (data.adfree) {
                window.userAdfree = true;
            }

        })
        .catch(err => console.error(err));
}

const popunderURL = "https://valuedcowboysample.com/pu8tr2xdrk?key=8f36a9afbc7645afc5ca1379dc42e46a";
const localStorageKey = "lastPopunderTime";
const interval = 5 * 60 * 1000; // 30 minutes in milliseconds

function shouldOpenPopunder() {
    if (window.userAdfree) return;
    const lastTime = parseInt(localStorage.getItem(localStorageKey), 10) || 0;
    const now = Date.now();
    return ((now - lastTime) >= interval) && (window.location.pathname !== "/");
}

function openPopunder() {
    const newWin = window.open(popunderURL, "_blank");
    if (!newWin) return; // blocked by browser

    // Attempt to create popunder effect
    newWin.blur();
    window.focus();

    // Save the time
    localStorage.setItem(localStorageKey, Date.now().toString());
}

// Trigger only on user interaction
// document.addEventListener("click", function handler() {
//     if (shouldOpenPopunder()) {
//         openPopunder();
//     }
//     document.removeEventListener("click", handler); // trigger only once per page load
// });

const modal = document.getElementById("authModal");
const btn = document.getElementById("loginModalBtn");
const closeBtn = document.getElementsByClassName("close")[0];
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// Open the modal when the button is clicked
btn.onclick = function() {
    if (localStorage.getItem('token')) {
        window.location = "/account/";
    } else {
        modal.style.display = "block";
    }
};

// Close the modal when the close icon is clicked
closeBtn.onclick = function() {
    modal.style.display = "none";
};

// Close the modal when clicking outside the modal content
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

// Tab switching logic
loginTab.onclick = function() {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
};

registerTab.onclick = function() {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    loginForm.style.display = "none";
    registerForm.style.display = "block";
};

document.querySelector("#loginForm form").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const result = await response.text();

        if (result === "acc") {
            document.getElementById('loginStatus').innerHTML = `<p>Account does not exist. Please register.</p>`;
        } else if (result === "pass") {
            document.getElementById('loginStatus').innerHTML = `<p>Incorrect password</p>`;
        } else {
            // Optionally store the token for subsequent authenticated requests
            document.getElementById('loginStatus').innerHTML = `<p>Logged in. Loading game data.</p>`;
            fetch(`https://${window.location.host}/api/loadGameData`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ result }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.gameData) {
                        const storageData = data.gameData;
                        localStorage.clear();
                        for (const key in storageData) {
                            localStorage.setItem(key, storageData[key]);
                        }
                        document.getElementById('loginModalBtn').innerHTML = `<span id="loginSpan" class="material-symbols-outlined">logout</span>Logout`;
                        console.log("LocalStorage data loaded:", storageData);
                        localStorage.setItem("token", result);
                        modal.style.display = "none";
                        window.location.reload();
                    }
                });
        }
    } catch (error) {
        console.error("Login error:", error);
        document.getElementById('loginStatus').innerHTML = `<p>Login failed. Please try again.</p>`;
    }
});

// Handle Register Form Submission
document.querySelector("#registerForm form").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const token = await response.text();

        if (token === "exists") {
            document.getElementById('loginStatus').innerHTML = `<p>Account already exists. Please log in.</p>`;
        } else {
            document.getElementById('loginModalBtn').innerHTML = `<span id="loginSpan" class="material-symbols-outlined">logout</span>Logout`;
            const localStorageData = { ...localStorage }; // Clone localStorage as an object
            delete localStorageData.token;
            fetch("https://" + window.location.hostname + `/api/saveGameData`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, localStorageData }),
            })
                .then(response => response.json())
                .then(data => {
                    console.log("LocalStorage data saved:", data);
                    localStorage.setItem("token", token);
                    modal.style.display = "none";
                    document.getElementById('loginStatus').innerHTML = `<p>Registration successful.</p>`;
                })
                .catch(error => console.error("Error saving localStorage data:", error));
        }
    } catch (error) {
        console.error("Registration error:", error);
        document.getElementById('loginStatus').innerHTML = `<p>Registration failed. Please try again.</p>`;
    }
});

(function initUpdateNotifier() {
    const updateVersion = "2026-05-uv-return";
    const dismissedVersionKey = "dismissedUpdateNoticeVersion";

    if (localStorage.getItem(dismissedVersionKey) === updateVersion) return;

    const notifier = document.createElement("div");

    notifier.innerHTML = `
        <div id="updateNotice" role="status" aria-live="polite">
            <button id="updateNoticeClose" type="button" aria-label="Dismiss update notice">x</button>
            <div class="update-notice-label">Update</div>
            <div class="update-notice-copy">
                Ads are back. You can buy ad-free in the Account Store, and we switched back to the old, faster proxy backend.
            </div>
        </div>
    `;

    const style = document.createElement("style");
    style.innerHTML = `
        #updateNotice {
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 999999;
            max-width: 340px;
            padding: 16px 18px;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            background: rgba(20, 20, 20, 0.96);
            color: #fff;
            box-shadow: 0 10px 28px rgba(0,0,0,0.4);
            font-family: Arial, sans-serif;
            line-height: 1.45;
        }

        #updateNoticeClose {
            position: absolute;
            top: 8px;
            right: 8px;
            border: 0;
            background: transparent;
            color: rgba(255,255,255,0.72);
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
        }

        #updateNoticeClose:hover {
            color: #fff;
        }

        .update-notice-label {
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8fd3ff;
        }

        .update-notice-copy {
            padding-right: 20px;
            font-size: 15px;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notifier);

    document.getElementById("updateNoticeClose").onclick = () => {
        localStorage.setItem(dismissedVersionKey, updateVersion);
        notifier.remove();
    };
})();

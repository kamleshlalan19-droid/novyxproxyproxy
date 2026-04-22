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
    if(localStorage.getItem('token')) {
        window.location = "/account/"
    } else {
        modal.style.display = "block";
    }
}

// Close the modal when the close icon is clicked
closeBtn.onclick = function() {
    modal.style.display = "none";
}

// Close the modal when clicking outside the modal content
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// Tab switching logic
loginTab.onclick = function() {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
}

registerTab.onclick = function() {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    loginForm.style.display = "none";
    registerForm.style.display = "block";
}

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

        if(result === "acc") {
            document.getElementById('loginStatus').innerHTML = `<p>Account does not exist. Please register.</p>`;
        } else if(result === "pass") {
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
                        localStorage.clear()
                        for (const key in storageData) {
                            localStorage.setItem(key, storageData[key]);
                        }
                        document.getElementById('loginModalBtn').innerHTML = `<span id="loginSpan" class="material-symbols-outlined">logout</span>Logout`;
                        console.log("LocalStorage data loaded:", storageData);
                        localStorage.setItem("token", result);
                        modal.style.display = "none";
                        window.location.reload();
                    }
                })
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

        if(token === "exists") {
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

(function () {
    if (localStorage.getItem("closedAdfreeNotice")) return;
    const box = document.createElement("div");

    box.innerHTML = `
        <div id="adfreeNotice">
            <span id="adfreeClose">✕</span>
            <div>
                Account holders can now complete surveys to go ad free.  
                Just select <b>My Account</b> in the top bar.
            </div>
        </div>
    `;

    const style = document.createElement("style");
    style.innerHTML = `
        #adfreeNotice {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1e1e1e;
            color: white;
            padding: 14px 18px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            z-index: 999999;
        }

        #adfreeClose {
            position: absolute;
            top: 6px;
            right: 8px;
            cursor: pointer;
            font-size: 14px;
            opacity: 0.7;
        }

        #adfreeClose:hover {
            opacity: 1;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(box);

    document.getElementById("adfreeClose").onclick = () => {
        localStorage.setItem("closedAdfreeNotice", "1");
        box.remove();
    };
})();

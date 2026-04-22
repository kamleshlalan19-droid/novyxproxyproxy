var panicKey = localStorage.getItem('settings_panicKey') || '`';
var panicWebsite =
    localStorage.getItem('settings_panicUrl') || 'https://drive.google.com';

const splashLines = [
    'Fast access, clean layout, no wasted space.',
    'Open the route you need and move.',
    'Proxy, games, and current links.',
    'Use Discord when the domain changes.',
];

$(document).keydown(function (e) {
    if (e.key === panicKey) {
        window.location.href = panicWebsite;
    }
});

(() => {
    const timeEl = document.getElementById('landing-live-time');
    const dateEl = document.getElementById('landing-live-date');
    const splashEl = document.querySelector('.landing-subtitle');

    const renderMeta = () => {
        const now = new Date();

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        }

        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        }
    };

    const rotateSplash = () => {
        if (!splashEl) return;

        let index = 0;
        splashEl.textContent = splashLines[index];

        setInterval(() => {
            index = (index + 1) % splashLines.length;
            splashEl.textContent = splashLines[index];
        }, 4000);
    };

    renderMeta();
    setInterval(renderMeta, 1000);
    rotateSplash();
})();

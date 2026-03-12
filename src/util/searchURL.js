import axios from 'axios';

function normalizeQuery(q) {
    return q
        .toLowerCase()
        .replace(/[^a-z0-9\s.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/*
EXTREMELY ILLEGAL / DANGEROUS TERMS
*/
const HARD_BLOCK = [

    // CSAM related
    "cp",
    "child porn",
    "children naked",
    "childporn",
    "childpornography",
    "minor sex",
    "underage sex",
    "teen sex",
    "preteens",
    "lolicon",
    "shotacon",
    "pthc",
    "pedo",
    "pedophile",
    "pedophilia",

    // porn sites
    "pornhub",
    "xvideos",
    "xnxx",
    "xhamster",
    "redtube",
    "youporn",
    "tube8",
    "spankbang",
    "hentai",
    "rule34",
    "rule 34",
    "sexvideos",
    "porn",
    "xxx",
    "nsfw",

    // dark web / illegal markets
    "dark web market",
    "carding site",
    "credit card dump",
    "buy stolen credit card",
    "buy cocaine",
    "buy heroin",
    "buy meth",
    "buy fentanyl",
    "hire a hitman",
    "hire hitman",
    "murder for hire",

    // violent illegal guides
    "how to build a bomb",
    "how to make a bomb",
    "pipe bomb",
    "pressure cooker bomb",
    "how to dispose of a body",
    "how to hide a body",
    "how to dissolve a body",

];

/*
SEXUAL CONTEXT WORDS
Used with age detection
*/
const SEX_CONTEXT = [
    "sex",
    "nude",
    "naked",
    "porn",
    "xxx",
    "rule34",
    "hentai",
    "lewd",
    "nsfw",
    "boobs",
    "blowjob",
    "anal",
    "fetish",
    "cum",
    "milf",
    "bdsm",
    "bikini",
    "topless",
    "dih",
    "penis",
    "butt",
    "booty",
    "bootty",
    "rape",
    "vag",
    "vagina",
    "dick"
];

/*
Regex patterns
*/
const AGE_REGEX = /\b([0-9]|1[0-7])\s?(yo|yr|yrs|year|years)\s?old?\b/;
const AGE_SIMPLE = /\b([0-9]|1[0-7])\b/;

function containsSexContext(q) {
    return SEX_CONTEXT.some(word => q.includes(word));
}

function isBlocked(query) {

    const q = normalizeQuery(query);

    // direct block words
    for (const word of HARD_BLOCK) {
        if (q.includes(word)) return true;
    }

    // age + sexual context
    if (AGE_REGEX.test(q) && containsSexContext(q)) {
        return true;
    }

    // simple age numbers with sexual terms
    if (AGE_SIMPLE.test(q) && containsSexContext(q)) {
        return true;
    }

    return false;
}

async function searchURL(
    input,
    searchEngine = "https://www.google.com/search?q=%s",
) {

    plausible("Search", {props: {"Query": input}});

    if (isBlocked(input)) {

        alert("This search is blocked on this proxy, and has been logged.");

        return (
            window.location.origin +
            window.__uv$config.prefix +
            window.__uv$config.encodeUrl("https://example.com")
        );
    }

    const q = normalizeQuery(input);

    if (q.includes('roblox')) {
        alert('go to nowgg.lol for unblocked roblox');
    }

    if (input.match(/^https?:\/\//)) {
        return (
            window.location.origin +
            window.__uv$config.prefix +
            window.__uv$config.encodeUrl(input)
        );

    } else if (input.includes(".") && !input.includes(" ")) {

        return (
            window.location.origin +
            window.__uv$config.prefix +
            window.__uv$config.encodeUrl("https://" + input)
        );

    } else {

        return (
            window.location.origin +
            window.__uv$config.prefix +
            window.__uv$config.encodeUrl(
                searchEngine.replace("%s", encodeURIComponent(input))
            )
        );
    }
}

export { searchURL };
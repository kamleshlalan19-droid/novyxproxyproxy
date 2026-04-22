const Fullscreen = function () {
    return (
        <svg
            class={this.class || ""}
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M8 3H3v5" />
            <path d="M16 3h5v5" />
            <path d="M21 16v5h-5" />
            <path d="M3 16v5h5" />
        </svg>
    );
};

export default Fullscreen;

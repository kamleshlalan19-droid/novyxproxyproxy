const Head = function () {
    useChange(this.theme, () => {
        document.body.dataset.theme = this.theme;
        localStorage.setItem("@nano/theme", this.theme);
    });

    return <div></div>;
};

export default Head;

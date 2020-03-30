window.addEventListener("load", function () {
	function getQueryString() {
		if (window.location.search.length === 0) return null;
		const paramsObj = {};
		Array.from(new URLSearchParams(window.location.search).entries()).forEach(pair => paramsObj[pair[0]] = pair[1]);
		return paramsObj;
	}
	const query = getQueryString();
	const heading = document.getElementById("heading");
	if (query !== null && "data" in query) {
		const config = JSON.parse(atob(query.data));
		if (config.text !== "") {
			const origText = heading.textContent;
			heading.textContent = config.text;
			heading.classList.remove("hidden");
			window.setTimeout(() => heading.textContent = origText, 10000);
		}
	}
	// Dynamically loads a CSS Stylesheet from a URL.
	const link = document.createElement("link");
	document.head.appendChild(link);
	function loadStyle(url) {
		link.setAttribute("id", "themeLink");
		link.setAttribute("href", url);
		link.setAttribute("type", "text/css");
		link.setAttribute("rel", "stylesheet");
	}
	window.loadStyle = loadStyle;
	var currentTheme = "default";
	const themes = [
		"default",
		"dark",
		"terminal",
		"booru"
	]
	const themeList = document.querySelector("#themeList");
	window.setHockitTheme = function (theme) {
		if (theme === currentTheme) return;
		window.localStorage.setItem("theme", theme);
		currentTheme = theme;
		themeList.selectedIndex = themes.indexOf(theme);
		loadStyle("/themes/" + theme + ".css");
	};
	const theme = window.localStorage.getItem("theme");
	if (theme !== null) setHockitTheme(theme);
	themeList.addEventListener("change", () => {
		const theme = themeList.value;
		setHockitTheme(theme);
	});
});

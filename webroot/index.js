window.addEventListener("load", () => {
	const file = document.getElementById("file");
	const button = document.getElementById("button");
	const form = document.getElementById("form");
	file.addEventListener("change", () => {
		if (file.files.length > 0) {
			button.setAttribute("value", "Hock it up!");
			form.setAttribute("action", "/up");
		} else {
			button.setAttribute("value", "List Files");
			form.setAttribute("action", "/list");
		}
	});
});
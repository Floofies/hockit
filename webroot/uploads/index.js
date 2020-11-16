// 
function getHash() {
	if (window.location.hash.length < 2) return null;
	return window.location.hash.slice(1, window.location.hash.length)
}
function getQueryString() {
	if (window.location.search.length === 0) return null;
	const paramsObj = {};
	Array.from(new URLSearchParams(window.location.search).entries()).forEach(pair => paramsObj[pair[0]] = pair[1]);
	return paramsObj;
}
function copyToClipboard(str) {
	const el = document.createElement('textarea');
	el.value = str;
	document.body.appendChild(el);
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
};
window.addEventListener("load", () => {
	const query = getQueryString();
	if (query === null) return;
	const config = JSON.parse(atob(query.data));
	const files = config.links.files;
	const total = config.links.total;
	const heading = document.getElementById("heading");
	const totalCounter = document.getElementById("total");
	const list = document.getElementById("list");
	const itemTempl = document.getElementById("itemTemplate").cloneNode(true);
	const delBox = document.getElementById("delBox");
	const delText = document.getElementById("delText");
	const delConfirm = document.getElementById("delConfirm");
	const yesBtn = document.getElementById("yesBtn");
	const noBtn = document.getElementById("noBtn");
	const pwBox = document.getElementById("pwBox");
	const pwForm = document.getElementById("pwForm");
	const pwFormSubmit = document.getElementById("pwFormSubmit");
	const passInput = document.getElementById("password");
	const homeBtn = document.getElementById("homeBtn");
	const listBtn = document.getElementById("listBtn");
	const viewLayoutBtn = document.getElementById("viewLayoutBtn");
	const viewSwapBtn = document.getElementById("viewSwapBtn");
	const viewSizeBtn = document.getElementById("viewSizeBtn");
	const pageInput = document.getElementById("page");
	const nextBtn = document.getElementById("nextPage");
	const prevBtn = document.getElementById("prevPage");
	const hash = getHash();
	if (hash !== null) {
		const pair = hash.split("/");
		var page = Number(pair[0]);
		var totalPages = Number(pair[1]);
		if (totalPages < 1) totalPages = 1;
		else totalPages = Math.ceil(totalPages);
	} else {
		var page = 0;
		var totalPages = 1;
	}
	pageInput.value = page;
	if (files.length === 1) heading.textContent = "hockit list " + files[0].hash;
	totalCounter.textContent = files.length + " of " + total + " Files, Page " + (page + 1) + " of " + totalPages;
	var newView = window.localStorage.getItem("view");
	var curView = "grid";
	function setLayout(layout = null) {
		list.classList.remove(curView + "View");
		if (curView === "list") curView = "grid";
		else if (curView === "grid") curView = "list";
		if (layout === "list") curView = layout;
		else if (layout === "grid") curView = layout;
		list.classList.add(curView + "View");
		const opposite = ((curView === "grid") ? "agenda" : "grid");
		viewLayoutBtn.setAttribute("src", "/themes/view-" + opposite + ".png");
		viewLayoutBtn.setAttribute("title", "Display items as " + ((curView === "grid") ? "list" : "grid"));
		window.localStorage.setItem("view", curView);
		if (curView === "grid") truncate();
	}
	var order = "Ascending";
	function setOrder() {
		if (order === "Ascending") order = "Descending";
		else if (order === "Descending") order = "Ascending";
		viewSwapBtn.classList.toggle("flip");
		viewSwapBtn.setAttribute("title", "Sort by Age in " + order + " order");
		const nodes = Array.from(list.childNodes).sort(() => -1);
		while (list.hasChildNodes()) list.removeChild(list.lastChild);
		for (const node of nodes) list.appendChild(node);
	}
	var size = "Small";
	function setSize() {
		if (size === "Small") size = "Large";
		else if (size === "Large") size = "Small";
		const opposite = ((size === "Large") ? "Small" : "Large");
		viewSizeBtn.setAttribute("src", "/themes/image-size-select-" + opposite.toLowerCase() + ".png");
		viewSizeBtn.setAttribute("title", "Show " + opposite + " Thumbnails");
		list.classList.toggle("largeThumbs", size === "Large");
		window.setTimeout(truncate, 100);
	}
	viewLayoutBtn.addEventListener("click", setLayout);
	viewSwapBtn.addEventListener("click", setOrder);
	viewSizeBtn.addEventListener("click", setSize);
	if ((page + 1) < totalPages) {
		nextBtn.classList.remove("hidden");
		nextBtn.addEventListener("click", () => {
			page++;
			pageInput.value = page;
			pwForm.setAttribute("action", "/list");
			if (passInput.value.trim() !== "") pwForm.submit();
			else pwBox.classList.remove("hidden");
		});
	}
	if (page !== 0) {
		prevBtn.classList.remove("hidden");
		prevBtn.addEventListener("click", () => {
			if (page === 0) return;
			page--;
			pageInput.value = page;
			pwForm.setAttribute("action", "/list");
			if (passInput.value.trim() !== "") pwForm.submit();
			else pwBox.classList.remove("hidden");
		});
	}
	homeBtn.addEventListener("click", () => {
		location.href = "/";
	});
	listBtn.addEventListener("click", () => {
		pwForm.setAttribute("action", "/list");
		if (passInput.value.trim() !== "") pwForm.submit();
		else pwBox.classList.remove("hidden");
	});
	yesBtn.addEventListener("click", () => {
		delConfirm.classList.add("hidden");
		delBox.classList.add("hidden");
		pwBox.classList.remove("hidden");
	});
	noBtn.addEventListener("click", () => {
		delBox.classList.add("hidden");
	});
	passInput.addEventListener("input", () => {
		if (passInput.value === "") pwFormSubmit.textContent = "Cancel";
		else pwFormSubmit.textContent = "Ok";
	});
	pwFormSubmit.addEventListener("click", (e) => {
		e.preventDefault();
		if (passInput.value.trim() === "") pwBox.classList.add("hidden");
		else pwForm.submit();
	});
	for (const file of files.sort(() => -1)) {
		const templ = itemTempl.cloneNode(true).content;
		const thumbLink = templ.querySelector("[name=thumbLink]");
		thumbLink.setAttribute("href", "/" + file.hash);
		thumbLink.setAttribute("title", file.name);
		const thumb = templ.querySelector("[name=thumb]");
		const listener = (e) => {
			thumb.setAttribute("src", "/themes/file-download-outline.png");
			e.target.removeEventListener("error", listener);
		};
		thumb.addEventListener("error", listener);
		thumb.setAttribute("src", "t-" + file.hash + "." + file.name);
		thumb.setAttribute("title", file.name);
		const link = templ.querySelector("[name=link]");
		link.setAttribute("href", "/" + file.hash);
		link.setAttribute("title", file.hash);
		link.textContent = file.hash;
		const date = templ.querySelector("[name=date]");
		const fileDate = new Date(file.date);
		const year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(fileDate);
		const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(fileDate);
		const day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(fileDate);
		dateStr = month + " " + day + "\n" + year;
		date.textContent = dateStr;
		date.setAttribute("title", dateStr);
		const name = templ.querySelector("[name=name]");
		name.textContent = file.name;
		name.setAttribute("title", file.name);
		name.setAttribute("href", "/" + file.hash);
		const copyBtn = templ.querySelector("[name=copy]");
		copyBtn.addEventListener("click", () => {
			const url = window.location.protocol + "//" + window.location.host + "/" + file.hash;
			copyToClipboard(url);
			flash("Copied " + url);
		});
		const delBtn = templ.querySelector("[name=delBtn]");
		delBtn.addEventListener("click", () => {
			delText.textContent = "Delete " + file.name + "?";
			pwForm.setAttribute("action", "/delete/" + file.hash);
			delBox.classList.remove("hidden");
		});
		list.appendChild(templ);
	}
	const nodes = document.querySelectorAll("[name=name]");
	function truncate() {
		nodes.forEach(node => delete node.removeAttribute("data-tail"));
		nodes.forEach(node => {
			if (node.offsetWidth < node.scrollWidth) {
				node.dataset.tail = node.textContent.slice(node.textContent.length - 8);
			}
		});
	}
	if (newView === "list") setLayout("list");
	else truncate();
});
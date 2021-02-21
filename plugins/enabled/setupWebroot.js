const { Datum } = require("../omnibus.js");
const fs = require('fs');
const FR = fs.constants.F_OK | fs.constants.R_OK;
POSIXPlugin.confLock = false;
const File = new Datum("FileBlob");
const BootConfigDatum = new Datum("BootConfig");
module.exports = {
	name: "WebRootSetupPlugin",
	version: "1.0.0",
	initPlugin: setupWebRoot,
	File,
	BootConfigDatum
}
// Replaces a file if it is missing, or if it differs from the default file.
async function repairFile(defaultPath, path) {
	const defaultData = (await fs.promises.readFile(defaultPath)).toString();
	const data = await File.get(path);
	if (!data || data !== defaultData) await File.set(path, defaultData);
}
async function repairDirectory(path) {
	if (!(await File.get(path))) await File.set(path);
}
// Performs readability and integrity checks on critical webroot files.
async function setupWebRoot() {
	const config = BootConfigDatum.get();
	// Webroot directory
	const localRoot = __dirname + "/webroot/";
	const leading = config.webroot.length === 0 ? false : config.webroot[config.webroot.length - 1] === "/";
	const webRoot = config.webroot + (leading ? "" : "/");
	if (webRoot !== "/") await repairFolder(webRoot);
	// Index page HTML
	await repairFile(localRoot + "index.html", webRoot + "index.html");
	// Index page JS
	await repairFile(localRoot + "index.js", webRoot + "index.js");
	// Uploads page directory
	await repairDirectory(webRoot + "uploads/");
	// Uploads page HTML
	await repairFile(localRoot + "uploads/index.html", webRoot + "uploads/index.html");
	// Uploads page JS
	await repairFile(localRoot + "uploads/index.js", webRoot + "uploads/index.js");
	// Cascading Style Sheets, GUI PNG images, and dynamic CSS loader theme.js
	const defaultThemesPath = localRoot + "themes/";
	const themesPath = webRoot + "themes/";
	await repairDirectory(themesPath);
	const files = await fs.promises.readdir(defaultThemesPath);
	for (const file of files) {
		await repairFile(defaultThemesPath + file, themesPath + file);
	}
}
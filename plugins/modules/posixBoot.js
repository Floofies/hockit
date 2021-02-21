// Used in bootstrapping of the main application script with initial configuration data.
// Reads/writes the boot configuration in a local JSON file.
const fs = require('fs');
// We will use the Omnibus Datum I system to manage a BootConfigDatum.
const { Datum } = require("../omnibus.js");
const FR = fs.constants.F_OK | fs.constants.R_OK;
// Main HockIt folder for executables and configurables.
const hockitPath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + "/.hockit";
const confPath = hockitPath + "/config.json";
const BootConfigDatum = new Datum("BootConfig",
	null,
	readConfig,
	saveConfig,
	resetConfig
);
module.exports = {
	name: "BootConfgPOSIXPlugin",
	version: "1.0.0",
	initPlugin,
	BootConfigDatum
};
function initPlugin() {
	try { fs.accessSync(confPath, FR); }
	catch (_) { repairConfig(); }
}
// Will most likely run if HockIt is updated to a new version.
// PEBCAK errors may also trigger this function...
function repairConfig() {
	try { fs.accessSync(hockitPath, FR); }
	catch (_) { fs.mkDirSync(hockitPath) }
	try {
		fs.accessSync(confPath, FR);
		const config = JSON.parse(_readConfigFile());
		const keys = Object.keys(config);
		var missingKey = false;
		// Adds missing properties to the JSON file if any are missing.
		const defaultConfig = BootConfigDatum.make();
		Object.keys(defaultConfig).forEach(key => {
			if (!keys.includes(key)) {
				config[key] = defaultConfig[key];
				missingKey = true;
			}
		});
		if (missingKey) saveConfig(config);
	} catch (_) {
		if (err.code === "ENOENT") resetConfig();
		else throw err;
	}
}
// Stub to avoid infinite looping when things go wrong
function _readConfigFile() {
	return fs.readFileSync(confPath).toString("utf8");
}
function readConfig() {
	var confJson = null;
	try {
		fs.accessSync(confPath, FR);
		confJson = _readConfigFile();
		if (!confJson) throw new TypeError("The config.json file is unreadable and could not be repaired.");
		return JSON.parse(confJson);
	} catch (err) {
		if (err.code === "ENOENT") repairConfig();
		else throw err;
	};
}
function saveConfig(config) {
	fs.writeFileSync(confPath, JSON.stringify(config));
}
function resetConfig() {
	saveConfig(BootConfigDatum.make());
}
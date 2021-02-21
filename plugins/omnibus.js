// Omnibus Mixin Plugin Loader & Tagged Union System
// LESS THAN 50% PEANUTS*
const prod = process.env.NODE_ENV === "production";
const fs = require('fs');
module.exports = Omnibus;
function Omnibus(pluginsPath) {
	this.datums = {};
	this.plugins = {};
	const enabledPath = pluginsPath + "/enabled";
	// Import and set up enabled plugins.
	const enabledPlugins = fs.readDirSync(enabledPath);
	for (const name of enabledPlugins) {
		// Avoid the improbable non-JavaScript file
		if (name.slice(name[name.length - 3]) === ".js")
			this.addPlugin(require(enabledPath + "/" + name));
	}
}
// Adds datum2 state methods to datum1 if any are missing.
function patch(datum1, datum2) {
	if (!("make" in datum1) && "make" in datum2) datum1.make = datum2.make;
	if (!("get" in datum1) && "get" in datum2) datum1.get = datum2.get;
	if (!("set" in datum1) && "set" in datum2) datum1.set = datum2.set;
	if (!("delete" in datum1) && "delete" in datum2) datum1.delete = datum2.delete;
}
// Mimics Mixin behavior via cross-assigning methods between identically tagged Datum.
// An equal opportunity ass-kicker.
function mixin(datum1, datum2) {
	patch(datum1, datum2);
	patch(datum2, datum1);
}
Omnibus.prototype.initPlugins = async function () {
	for (const plugin of this.plugins) {
		if ("initPlugin" in plugin) plugin.initPlugin.call(plugin);
	}
};
Omnibus.prototype.addDatum = function (datum1) {
	if (!("def" in datum1)) throw new TypeError("Omnibus plugin loaded non-Datum value");
	const type = datum1.def;
	if (!(type in this.datums)) this.datums[type] = [];
	else for (const datum2 of this.datums[type]) mixin(datum1, datum2);
	this.datums[type].push(datum1);
};
Omnibus.prototype.addPlugin = function (plugin) {
	const pluginName = ("name" in plugin) ? plugin.name : "Unknown Plugin";
	// Plugins become available as data & Omnibus-bound methods.
	for (const prop in plugin) {
		if (prop === "name" || prop === "version") continue;
		if (prop === "initPlugin") continue;
		else this.addDatum(plugin[prop]);
	}
	this.plugins[pluginName] = plugin;
	if (!prod) console.info("Omnibus: Loaded plugin \"" + pluginName + "\" successfully");
};
// Creates new Datum instance, adds it to the Omnibus instance, and returns the Datum.
Omnibus.prototype.getNewDatum = function (definition, maker = null, getter = null, setter = null, deleter = null) {
	const datum = new Datum(definition, maker, getter, setter, deleter);
	this.addDatum(datum);
	return datum;
};
// Omnibus Datum I
// Priority 1: Protect the innocent.
// Data-centric coupling middleware for Plugins & APIs, and a source of new data.
// Omnibus interoperates systems via the global union of their identically-typed Datum.
Omnibus.prototype.Datum = Datum;
Omnibus.Datum = Datum;
const noOp = () => { };
function Datum(definition, maker = null, getter = null, setter = null, deleter = null) {
	// Unique Type Definition String
	this.def = definition;
	// Creates new data of the defined type.
	if (maker !== null) this.make = maker;
	// Retrieves data from Plugins.
	if (getter !== null) this.get = getter;
	// Transmits data to Plugins.
	if (setter !== null) this.set = setter;
	// Deletes specific persistent data.
	if (deleter !== null) this.delete = deleter;
};
// Let unimplemented operations fall down to no-ops.
Datum.prototype.make = noOp;
Datum.prototype.set = noOp;
Datum.prototype.get = noOp;
Datum.prototype.delete = noOp;
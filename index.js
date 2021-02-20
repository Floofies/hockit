const bcrypt = require("bcrypt");
const filenamify = require("filenamify");
const imageThumbnail = require("image-thumbnail");
// 99% of app-critical data handling functions are implemented inside Omnibus.
const Omnibus = require("./plugins/omnibus.js");
// Omnibus Datum I class constructor.
const Datum = Omnibus.Datum;
const fs = require('fs');
const prod = process.env.NODE_ENV === "production";
module.exports = Hockit;
const BootConfigDatum = new Datum("BootConfig", function () {
	return {
		webroot: this.hockitPath + "/webroot",
		port: 8080,
		fqdn: "",
		ssl: false,
		sslKey: "",
		sslCert: "",
		sslPass: ""
	};
});
const TokenDatum = new Datum("Token");
const BCryptHashDatum = new Datum("PasswordHash");
const FileBlobDatum = new Datum("FileBlob");
const FileMetaDatum = new Datum("FileMetadata", async function (filename, username) {
	var hash;
	// Guarantee of hash interdivergence.
	while (await FileDatum.get(hash = nanoid(5)));
	return {
		name: filenamify(filename),
		hash: hash,
		date: Date.now(),
		user: username
	};
});
const ThumbDatum = new Datum("Thumbnail",
	(name, hash) => "t-" + filenamify(hash + "." + name)
);
function Hockit() {
	this.homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
	// Root folder for executables
	this.hockitPath = this.homePath + "/.hockit";
	try { fs.accessSync(this.hockitPath, FR); }
	catch (_) { fs.mkdirSync(this.hockitPath); }
	// Initial boot configuration
	this.confPath = this.hockitPath + "/config.json";
	// Set up mixin plugin loader as main data bus.
	// Omnibus loads plugins from: "./plugins/enabled"
	this.bus = new Omnibus(this.hockitPath + "/plugins");
	// Register mixins with Omnibus.
	// Our local Datums gain superpowers from other plugins!
	this.bus.addPlugin({
		name: "HockIt",
		version: "1.0.0",
		BootConfigDatum,
		FileBlobDatum,
		FileMetaDatum,
		ThumbDatum,
		UserDatum,
		TokenDatum,
		TokenListDatum,
		BCryptHashDatum
	});
}
Hockit.prototype.start = async function () {
	const httpd = require("./src/httpd.js");
	this.bus.addPlugin(httpd);
	return httpd.initPlugin();
};
Hockit.prototype.up = function (buf, name) {
	const file = FileDatum.make(buf, name);

};
Hockit.prototype.copy = function () {

};
Hockit.prototype.delete = function () {

};
Hockit.prototype.list = function () {

};
Hockit.prototype.find = function () {

};
// Self-testing plugin for HockIt Omnibus. Simulates expected production data.
// Like Bernie Madoff, it just makes things up.
const { Datum } = require("../omnibus.js");
const prod = process.env.NODE_ENV === "production";
const nanoid = require("nanoid").nanoid;
function implWarning(name) {
	if (!prod) console.warn("TestPlugin: Plugin method \"" + name + "\" is not implemented.");
}
function initPlugin() {
	implWarning("initPlugin");
	this.someData = "Hello World";
	this.config = this.defaultConfig;
}
function saveConfig(config) {
	this.config = config;
}
function resetConfig() {
	this.config = this.defaultConfig;
}
function readConfig(confPath) {
	return this.config;
}
const tokens = {};
const TokenDatum = new Datum("Token",
	() => nanoid(32),
	id => [id, tokens[id]],
	pair => tokens[pair[0]] = pair,
	id => delete tokens[id]
);
const TokenListDatum = new Datum("TokenList",
	() => { return {}; },
	() => tokens,
	list => tokens = list,
	() => tokens = {}
);
const users = {};
const UserDatum = new Datum("User",
	function (name, hash) {
		return {
			user: name,
			hash: hash
		};
	},
	username => users[username],
	userData => users[userData.user] = userData,
	username => delete users[username]
);

const BCryptHashDatum = new Datum("PasswordHash",
	password => password + "12345",
	username => users[username].hash,
	(username, hash) => users[username].hash = hash,
	username => users[username].hash = ""
);
const links = {};
const FileDatum = new Datum("File",
	function (name, hash, date) {
		return {
			name: name,
			hash: nanoid(5),
			date: Date.now()
		};
	},
	hash => links[hash],
	file => links[file.hash] = file,
	hash => delete links[hash]
);
function DefaultConfig() {
	return {
		webroot: "/webroot",
		port: 8080,
		fqdn: "",
		ssl: false,
		sslKey: "",
		sslCert: "",
		sslPass: ""
	};
}
const config = {};
const BootConfigDatum = new Datum("BootConfig",
	defaultConfig,
	() => config,
	newConfig => config = newConfig,
	() => config = defaultConfig()
);
const TestPlugin = {
	name: "TestPlugin",
	version: "1.0.0",
	initPlugin,
	FileDatum,
	FileListDatum,
	UserDatum,
	TokenDatum,
	SessionDatum,
	BCryptHashDatum,
	BootConfigDatum
};
module.exports = TestPlugin;
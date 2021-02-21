// Dummy plugin for HockIt Omnibus. Emits warnings when invoked in dev-mode.
// Crashes your server when actually used, like an Error-filled party-popper.
const { Datum } = require("../omnibus.js");
const prod = process.env.NODE_ENV === "production";
const DummyPlugin = {
	name: "DummyPlugin",
	version: "1.0.0",
	initPlugin,
	TokenDatum,
	TokenListDatum,
	UserDatum,
	FileDatum,
	ConfDatum
};
module.exports = DummyPlugin;
function implWarning(name) {
	if (!prod) console.warn("DummyPlug: Plugin method \"" + name + "\" is not implemented.");
	else throw new TypeError("DummyPlug: No Plugin found for operation \"" + name + "\".");
}
function initPlugin() {
	implWarning("initPlugin");
}
const TokenDatum = new Datum("Token",
	() => implWarning("Token Datum maker"),
	() => implWarning("Token Datum getter"),
	() => implWarning("Token Datum setter"),
	() => implWarning("Token Datum deleter")
);
const TokenListDatum = new Datum("TokenList",
	() => implWarning("TokenList Datum maker"),
	() => implWarning("TokenList Datum getter"),
	() => implWarning("TokenList Datum setter"),
	() => implWarning("TokenList Datum deleter")
);
const UserDatum = new Datum("User",
	() => implWarning("User Datum maker"),
	() => implWarning("User Datum getter"),
	() => implWarning("User Datum setter"),
	() => implWarning("User Datum deleter")
);
const BCryptHashDatum = new Datum("PasswordHash",
	() => implWarning("PasswordHash Datum maker"),
	() => implWarning("PasswordHash Datum getter"),
	() => implWarning("PasswordHash Datum setter"),
	() => implWarning("PasswordHash Datum deleter")
);
const FileDatum = new Datum("File",
	() => implWarning("File Datum maker"),
	() => implWarning("File Datum getter"),
	() => implWarning("File Datum setter"),
	() => implWarning("File Datum deleter")
);
const ConfDatum = new Datum("BootConfig",
	() => implWarning("BootConfig Datum maker"),
	() => implWarning("BootConfig Datum getter"),
	() => implWarning("BootConfig Datum setter"),
	() => implWarning("BootConfig Datum deleter")
);
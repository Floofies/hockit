// MongoDB plugin for HockIt Omnibus
const { Datum } = require("../omnibus.js");
const { MongoClient } = require("mongodb");
const mongoAddr = ("MONGODB_URI" in process.env) ? process.env.MONGODB_URI : null;
if (mongoAddr === null) throw new Error("Missing MongoDB Connection String!");
// Retrieves a Collection object from a DB object.
// If the Collection does not exist, then a new Collection is created.
// Throws an error if the Collection can't be created or retrieved.
async function getCollection(db, name) {
	try {
		const collection = await db.createCollection(name);
		return collection;
	} catch (e) {
		if (("codeName" in e) && e.codeName === "NamespaceExists") {
			return db.collection(name);
		} else throw e;
	}
}
var users = null;
var userLinks = null;
async function initPlugin() {
	// Setup/Retrieve drivers for MongoDB Collections & Documents.
	const mongo = new MongoClient(mongoAddr);
	await mongo.connect();
	const db = mongo.db("hockitdb");
	// Allows Datums to insert/delete/modify MongoDB Collection Documents.
	// Whitelist of API Access Tokens and their expiration dates.
	tokens = getCollection(db, "hockit-keystore");
	// Lookup Tokens by hash or shortname
	tokens.ensureIndex({ hash: 1 }, { unique: true });
	tokens.ensureIndex({ name: 1 }, { unique: true });
	tokens.ensureIndex({ owner: 1 });
	// Usernames and their BCrypt hashes.
	users = getCollection(db, "hockit-users");
	// Lookup Users by username.
	users.ensureIndex({ username: 1 }, { unique: true });
	// 1:1 mapping of shortlink hashes to POSIX file paths.
	userLinks = getCollection(db, "hockit-content");
	// Lookup Links by owner username or hash.
	userLinks.ensureIndex({ owner: 1 });
	userLinks.ensureIndex({ hash: 1 }, { unique: true });
}
const BCryptHashDatum = new Datum("PasswordHash",
	null,
	async function get(username) {
		return await users.findOne({ username: username }, { hash: 1 });
	},
	async function set(username, hash) {
		await users.updateOne({ username: username }, { $set: { hash: hash } });
	},
	async function del(username) {
		await BCryptHashDatum.set(username, null);
	}
);
// API Access Token
const TokenDatum = new Datum("Token",
	null,
	async function get(name, owner = null, token = null) {
		if (name !== "" && name !== null) {
			// Lookup token by its shortname
			return await tokens.findOne({ name: name });
		} else if (owner !== null) {
			// Lookup tokens by their owner username
			return await tokens.find({ owner: owner });
		} else if (token !== null) {
			// Lookup token by strict-matching
			return await tokens.findOne({ hash: token });
		} else return false;
	},
	async function set(tokenObj) {
		await tokens.insertOne(tokenObj);
	},
	async function del(name, token = null) {
		if (token !== null) await tokens.removeOne({ hash: token });
		else if (name !== null) await tokens.removeOne({ name: name });
	}
);
const UserDatum = new Datum("User",
	null,
	async function get(username) {
		return await users.findOne({ username: username });
	},
	async function set(userObj) {
		await users.insertOne(userObj);
	},
	async function del(username) {
		await users.removeOne({ username: username });
	}
);
const FileMetaDatum = new Datum("FileMetadata",
	null,
	async function get(hash) {
		return await userLinks.findOne({ hash: hash });
	},
	async function set(metaObj) {
		await userLinks.insertOne(metaObj);
	},
	async function del(hash) {
		await userLinks.removeOne({ hash: hash });
	}
);
const FileLinksDatum = new Datum("FileLinks",
	null,
	async function get(start, limit, username = null) {
		// Get file metadata for a specific user within an ordered insertion range.
		if (username !== null) {
			return await userLinks.find({ owner: username }).sort({ date: 1 }).skip(start).limit(limit);
		}
		// Get links for all users
		const linksCursor = userLinks.find();
		const links = [];
		userLinks.find().forEach(link => links.push(link));
		return links;
	},
	null,
	async function del(username = null) {
		// Delete all links for a user

	}
);
const MongoPlugin = {
	name: "MongoPlugin",
	version: "1.0.0",
	initPlugin,
	BCryptHashDatum,
	TokenDatum,
	UserDatum,
	FileMetaDatum
};
module.exports = MongoPlugin;
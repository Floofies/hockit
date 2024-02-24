This is the Work-In-Progress contribution guide for HockIt.

This text is meant to be a comprehensive developer-focused documentation for HockIt. Whether you want to make a Plugin or improve HockIt itself, this is the guide to read!

# Principles of Operation

There are wildly varying ways that end-users can interface with HockIt and the core module. Each of them is implemented in such a way that they rely on shared technologies, or even abstract ever-higher on each other.

## Standard CLI

HockIt fully exposes all of its core funcionality via `stdin`, `stdout`, and `stderr` via the module in `bin/hockit_cli.js`. There is no "terminal app" framework being used, instead we opt for a fairly simple reactor pattern. All control flow related to `argv` & `stdin` resides within a single universal `reactor` function, which implements all control flow via regular conditionals. Differentiation between standard standard CLI usage, JSON API, and Human-readable APIs is ascertained within `reactor` when it is time to return data.

## JSON API via CLI

The most basic and easy way to interact with HockIt is via the CLI, which returns JSON-formatted strings as data. JSON is chosen for this transaction because it is already supported in nearly every MPDPL and runtime, and as such HockIt may easily interoperate with them. It is important to seperate this functionality from TTY usage, as the CLI interface is assumed to be operating as a JSON API unless a TTY is detected, in which case Human-readable strings are generated instead.

## Human-Readable Strings via CLI

Power users may use HockIt via CLI and expect readable outputs as opposed to stringified JSON, therefore the CLI executable attempts to detect Terminal Emulators, and formats data to be Human-readable. For example, the `hockit config` command, when used in a TTY, then utilizes `console.table` to generate a Human-readable ASCII spreadsheet containing the (normally JSON-formatted) configuration data. It is important to seperate this functionality from non-TTY usage, as the CLI interface is assumed to be operating as a JSON API unless a TTY is detected.

## JSON API via HTTP

HockIt supports HTTP & HTTPS, and exposes most of its standard functionality via a token-authenticated HTTP interface. API access tokens can be generated via the CLI, and are just pseudorandom strings. The validity of any access token is predicated upon its presence within the server whitelist, and successful strict-comparison matching between the serverside token and clientside token. De-authorizing any access tokens simply consists of deleting the token from the server.

## Web Browser GUI

The `index.html` file present inside the webroot implements a very small webapp, a GUI HTTP client for HockIt's JSON API. The session system for browsers abstracts the JSON API somewhat by time-limiting the tokens it uses to transact with HockIt, such that risk of abuse/forgery/theft of tokens is reduced. The client first authenticates with the server by transmitting a user-supplied username and password. If the username and password are authenticated successfully (such that `bcrypt.compare` is happy), then HockIt-authorized credentials are generated, stored serverside, and then transmitted back to the client; the HTTP response from the server contains a session token "HTTPOnly" cookie, and an anti-CSRF token which the app stashes into `window.sessionStorage`. Both the session token and anti-CSRF token are pseudorandom strings, are essentially un-guessable, and are strictly compared to the strings stored serverside.

Any valid (active) session tokens and anti-CSRF tokens are indexed with user data. If the user's session "ends", then it should result in the total deletion the session token and anti-CSRF token from at least the server, effectively de-authorizing the credentials.

The anti-CSRF token is composed of an API access token with a lifetime of 5 minutes. The session token is not neccesarily an access token, but is required to validate the first token, and has a lifetime of 10 minutes. The server restricts the anti-CSRF token to a single use, but allows multiple uses of the session token. Anti-CSRF token replay attacks are completely mitigated by rotating (re-generating and swapping) the token every time a valid one is sent to the server, limiting any given token's authorization to a single request only.

# Theory of Operation

HockIt is a small collection of user interfaces, plugins, and APIs which are focused on uploading and managing files with varying back-end technologies.

## Foundational Technologies

## Plugins

Plugins are implemented via the `Mixin` and `SetupMixin` modules.

Each plugin loads functions into shared `Mixin` instances via `SetupMixin`, and those functions are shared throughout the application.

## Dummy Plugin

The `dummy.js` plugin is a critical fault tolerance system, and must **always** be loaded. Faults which prevent the successful initialization of required plugins may result in incompletely-populated `Mixin` instances which fail to supply the operations which are neccesary for the application to function. Because the aforementioned scenario may cause the application to severely malfunction, the plugin emits warnings when invoked in dev-mode, and when used in production mode the plugin purposely crashes the server. It's like an Error-filled party-popper.

By throwing an an error in production mode, critical application malfunctions have a reduced chance of causing damage/corruption to the database and configuration files. Operations which would have normally written incomplete or otherwise erroneous data are thereby prevented by shutting down the server.

## POSIX Plugin

The `posixBoot.js` plugin is the configuration initialization system for HockIt.

The following `Mixin` instance reads, writes, and deletes configuration data from the local file `~/.hockit/config.json`.

- Mixin `BootConfigMixin`, type `"BootConfig"`

## POSIXDB Plugin

The `posixDB.js` plugin is intended to be used for development purposes only. It is a replacement implementation for all of the operations included in the MariaDB plugin; the database operations are re-implemented as local filesystem operations on a JSON file.

Operations which would normally target a MariaDB database are instead implemented as JSON changes to HockIt's `config.json`.

## MariaDB Plugin

The supported database for HockIt is MariaDB. It is implemented via the `mariaDB.js` mixin plugin.

The following environment variables are required for the plugin to work:

`MARIADB_URI`: User to access database.
`MARIADB_USER`: User password.
`MARIADB_PASS`: IP address or DNS of database server.

The `mariaDB.js` plugin populates the following `Mixin` types with data-furnishing functions:

- Mixin `BCryptHashMixin`, type `PasswordHash`
- Mixin `TokenMixin`, type `Token`
- Mixin `TokenListMixin`, type `TokenList`
- Mixin `UserMixin`, type `User`
- Mixin `FileMetaMixin`, type `FileMetaData`

## Mixins and SetupMixins

The foundational supporting systems are `Mixin` and `SetupMixins`, a plug-in system which encapsulates most of HockIt's functionality. `Mixin` acts as a central bus for data which is app-critical and non-volatile, and most operations are implemented within its companion: the `Mixin` class. The design pattern of `Mixin` encourages you to rely on data-coupled systems rather than API-coupled systems.

Plugins operating at the business logic layer of the application supply `Mixin` objects to the rest of the application to implement the *data furnishing operations* of the system. Put simply, each `Mixin` is a small unified type system maintained (centralized) by the `SetupMixins` module, and each `Mixin` is a namespace of functors with specific roles in *creating*, *storing*, *retrieving*, and *deleting* non-volatile (persistent) data. Each `Mixin` may implement the methods `make`, `set`, `get`, and `delete`. For each unique type of `Mixin` in the system, all actual instances of such become the union of all Mixin of that type, regardless of where they came from.

Plain english: If at least two Mixin exist and are of the same type, then SetupMixins joins them together such that each contains an equivalent set of methods. This is elaborated further in the [Lemma 1](#lemma-1) and [Lemma 2](#lemma-2).

In most plugin systems, the disjoint implementations of plugins which interoperate with each other usually violate the Law Of Demeter heavily. The developer must be informed of the implementations of both systems such that they may "override" the underlying system; but this is not the goal of HockIt's SetupMixins plugins whatsoever.

When a plugin is initialized, its `Mixin` instances should be created as a limited uniqueness type within the scope of that module, and not wantonly created in excess or as a result of user input. Mixin should be *invoked* as a result of user input and then preserved in-memory for any subsequent needs.

### Lemma 1

`Mixin` primary use case looks just like Unbuffered Typed Channels.

In this hypothetical configuration, Plugin "A" only knows how to create new data, and Plugin "B" only knows how to store/delete that data. The Mixin created by Plugin "A" implements the `make` method, but does not implement `get`, `set`, or `delete`, whereas such methods *are* implemented in the Mixin created by Plugin "B".

- Where Data "0" exists in NodeJS's stack (as a JavaScript Variable).
- Where Data "1" exists in non-volatile storage (such as a database or file).
1. Plugin "A" implements the `make` method of Mixin "X", creating Data "0" from scratch.
	- Where the type definition string of Mixin "X" is `"ABC"` (identically to Mixin "Y").
	- Where Plugin "A" shares Mixin "X" with Plugin "B".
2. Plugin "B" implements the `get`, `set`, and `delete` methods of Mixin "Y", mutating Data "1".
	- Where the type definition string of Mixin "X" is `"ABC"` (identically to Mixin "X").
	- Where Plugin "B" shares Mixin "Y" with Plugin "A".
3. SetupMixins confirms that Mixins "X" and "Y" are of identical type definition, and composites them together.
	- The methods within Mixin "X" are assigned to Mixin "Y", and vice versa.
5. Plugin "A" invokes `make` on Mixin "X" to create Data "0".
6. Plugin "A" then invokes `set` on Mixin "X" to store Data "0".
7. Plugin "B" recieves Data "0", as it implemented the `set` method, and stores Data "0" as Data "1" as a result.

### Lemma 2

A real example is quite easy to follow, and is in fact the first step to initializing HockIt.

HockIt loads basic initial configuration data from a JSON file, and it does so via the Mixin `BootConfigMixin`. All methods in Mixin `BootConfigMixin` are implemented by Plugin "BootConfig" (named `bootstrap.js`).

- Where `config.json` exists in a JSON file on non-volatile storage.
- Where `BootConfig` exists in NodeJS's stack (as a JavaScript object).
1. Plugin "BootConfig" implements the `make`, `set`, `get`, and `delete` methods of Mixin `BootConfigMixin`.
	- Where the type definition string of Mixin `BootConfigMixin` is `BootConfig`.
	- Where Plugin "BootConfig" shares Mixin `BootConfigMixin` with the HockIt's `index.js`.
2. HockIt's `index.js` does not implement any methods on its own instance of `BootConfigMixin`.
	- Where the type definition string of Mixin `BootConfigMixin` is `BootConfig`.
	- Where HockIt's `index.js` shares Mixin `BootConfigMixin` with SetupMixins (and thus Plugin "BootConfig" as well).
3. SetupMixins confirms that both `BootConfigMixin` Mixins are of identical type definition, and composites them together.
	- The methods within the `BootConfigMixin` from "BootConfig" are assigned to the `BootConfigMixin` from HockIt's `index.js`, and vice versa.
4. HockIt's `index.js` invokes `get` on its `BootConfigMixin` to retrieve `config` from `config.json`
5. If default config data is desired, HockIt's `index.js` invokes `make` on its `BootConfigMixin`, returning an object containing sane defaults.
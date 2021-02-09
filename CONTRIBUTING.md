This is the Work-In-Progress contribution guide for HockIt.

This ~~wall of~~ text is meant to be a comprehensive developer-focused documentation for HockIt. Whether you want to make a Plugin or improve HockIt itself, this is the guide to read!

# Theory of Operation

HockIt is a small collection of user interfaces, plugins, and APIs which are focused on uploading and managing files with varying back-end technologies.

The foundational supporting system is the Omnibus, an aspect-oriented plug-in system which encapsulates most of HockIt's functionality. Omnibus acts as a central bus for data which is app-critical and non-volatile, and most operations are implemented within its companion: the Datum class. Datum smugly (and unapologetically) encourages you to rely on data-coupled systems rather than API-coupled systems.

## Omnibus, Plugins, and Datums

Plugins supply "Datum" objects to the rest of the application to implement the *data furnishing operations* of the system. Put simply, each "Datum" is a small unified type system maintained (centralized) by the `omnibus.js` module, and each Datum is a namespace of functors with specific roles in *creating*, *storing*, *retrieving*, and *deleting* non-volatile (persistent) data. Each Datum may implement the methods `make`, `set`, `get`, and `delete`. For each unique type of Datum in the system, all actual instances of such Datum become the union of all Datum of that type, regardless of where they came from.

Okay... in plain-er english: If at least two Datum exist and are of the same type, then Omnibus joins them together such that each contains the same set of methods. This is elaborated further in the [Lemma 1](#lemma-1) and [Lemma 2](#lemma-2).

In most Plugin systems, the disjoint implementations of plugins which interoperate with each other usually violate the Law Of Demeter heavily. The developer must be informed of the implementations of both systems such that they may "override" the underlying system; but this is not the goal of HockIt's Omnibus plugins whatsoever.

When a plugin is initialized, its Datum should be created as a limited uniqueness type within the scope of the Plugin module, and not wantonly created as a result of user input. Datum should be *invoked* as a result of user input and then preserved in-memory for any subsequent user inputs.

### Lemma 1

Datum's primary use case looks just like Unbuffered Typed Channels.

In this hypothetical configuration, Plugin "A" only knows how to create new data, and Plugin "B" only knows how to store/delete that data. The Datum created by Plugin "A" implements the `make` method, but does not implement `get`, `set`, or `delete`, whereas such methods *are* implemented in the Datum created by Plugin "B".

- Where Data "0" exists in NodeJS's stack (as a JavaScript Variable).
- Where Data "1" exists in non-volatile storage (such as a database or file).
1. Plugin "A" implements the `make` method of Datum "X", creating Data "0" from scratch.
	- Where the type definition string of Datum "X" is `"ABC"` (identically to Datum "Y").
	- Where Plugin "A" shares Datum "X" with Plugin "B".
2. Plugin "B" implements the `get`, `set`, and `delete` methods of Datum "Y", mutating Data "1".
	- Where the type definition string of Datum "X" is `"ABC"` (identically to Datum "X").
	- Where Plugin "B" shares Datum "Y" with Plugin "A".
3. Omnibus confirms that Datums "X" and "Y" are of identical type definition, and composites them together.
	- The methods within Datum "X" are assigned to Datum "Y", and vice versa.
5. Plugin "A" invokes `make` on Datum "X" to create Data "0".
6. Plugin "A" then invokes `set` on Datum "X" to store Data "0".
7. Plugin "B" recieves Data "0", as it implemented the `set` method, and stores Data "0" as Data "1" as a result.

### Lemma 2

A real example is quite easy to follow, and is in fact the first step to initializing HockIt.

HockIt loads basic initial configuration data from a JSON file, and it does so via the Datum `BootConfigDatum`. All methods in Datum `BootConfigDatum` are implemented by Plugin "BootConfig" (named `bootstrap.js`).

- Where `config.json` exists in a JSON file on non-volatile storage.
- Where `BootConfig` exists in NodeJS's stack (as a JavaScript object).
1. Plugin "BootConfig" implements the `make`, `set`, `get`, and `delete` methods of Datum `BootConfigDatum`.
	- Where the type definition string of Datum `BootConfigDatum` is `BootConfig`.
	- Where Plugin "BootConfig" shares Datum `BootConfigDatum` with the HockIt's `index.js`.
2. HockIt's `index.js` does not implement any methods on its own instance of `BootConfigDatum`.
	- Where the type definition string of Datum `BootConfigDatum` is `BootConfig`.
	- Where HockIt's `index.js` shares Datum `BootConfigDatum` with Omnibus (and thus Plugin "BootConfig" as well).
3. Omnibus confirms that both `BootConfigDatum` Datums are of identical type definition, and composites them together.
	- The methods within the `BootConfigDatum` from "BootConfig" are assigned to the `BootConfigDatum` from HockIt's `index.js`, and vice versa.
4. HockIt's `index.js` invokes `get` on its `BootConfigDatum` to retrieve `config` from `config.json`
5. If default config data is desired, HockIt's `index.js` invokes `make` on its `BootConfigDatum`, returning an object containing sane defaults.

# Principles of Operation

There are wildly varying ways that end-users can interface with HockIt and the core module. Each of them is implemented in such a way that they rely on shared technologies, or even abstract ever-higher on each other.

## Standard CLI

HockIt fully exposes all of its core funcionality via `stdin`, `stdout`, and `stderr` via the module in `bin/hockit_cli.js`. There is no "terminal app" framework being used, instead we opt for a fairly simple reactor pattern. All control flow related to `argv` & `stdin` resides within a single universal `reactor` function, which implements all control flow via regular conditionals. Differentiation between standard standard CLI usage, JSON API, and Human-readable APIs is ascertained within `reactor` when it is time to return data.

## JSON API via CLI

The most basic and easy way to interact with HockIt is via the CLI, which returns JSON-formatted strings as data. JSON is chosen for this transaction because it is already supported in nearly every MPDPL and runtime, and as such HockIt may easily interoperate with them. It is important to seperate this functionality from TTY usage, as the CLI interface is assumed to be operating as a JSON API unless a TTY is detected, in which case Human-readable strings are generated instead.

## Human-Readable Strings via CLI

Power users may use HockIt via CLI and expect readable outputs as opposed to stringified JSON, therefore the CLI executable attempts to detect Terminal Emulators, and formats data to be Human-readable. For example, the `hockit config` command, when used in a TTY, then utilizes `console.table` to generate a Human-readable ASCII spreadsheet containing the (normally JSON-formatted) configuration data. It is important to seperate this functionality from non-TTY usage, as the CLI interface is assumed to be operating as a JSON API unless a TTY is detected.

## JSON API via HTTP

HockIt supports HTTP & HTTPS, and exposes most of its standard functionality via an pre-authenticated HTTP interface. The API is pre-authenticated by generating API access tokens via CLI.


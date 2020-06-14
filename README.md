# HockIt File Server

HockIt is super-simple file sharing server software written in NodeJS; it has a web GUI, a JSON API, a CLI, and a standard I/O interface.

[![NPM](https://nodei.co/npm/hockit.png)](https://nodei.co/npm/hockit/)

# Install
Install the package globally to use the `hockit` executable:

```
npm i -g hockit
```

You can start a HockIt server in two commands.

- Run `hockit passwd` to set the web GUI password.
- Run `hockit start` to start the HTTP server.

The HockIt server should now be listening for HTTP requests on port 8080. Try it out by opening the HockIt web GUI via [localhost](http://localhost:8080)

A `.hockit` directory containing the default configuration & webroot directory will be created in the current user's home folder.

For setting up HockIt with a HTTPS/SSL certificate, see [SSL Configuration](#ssl-configuration)

# Hock it up there!

You can upload files via CLI in a Terminal, HTTP in a web browser, or via a REST API.

## Via HTTP

You can upload and list files via the web GUI. The default HTTP port is [8080](http://localhost:8080), which you can change via `hockit port`. Before uploading & listing you must set a password via `hockit passwd`.

## Via CLI

```
$ hockit up ~/Documents/hello.txt
http://my.website.com/p_9Gm
```

See [CLI Commands](#cli-commands)


## Via REST API

```
$ hockit token create helloworld
Generated new HockIt REST API token.
        helloworld -> hockitApiToken
$ curl http://my.website.com/up -F "upload=@myfile.png" -H "Authorization: hockitApiToken"
{"error":null,"data":{"files":[{"name":"myfile.png","hash":"0Z5kF","date":1585787847478}],"total":5}}
```

See [REST API](#rest-api)

# CLI Commands

General Syntax: `hockit <command> <parameter1> <parameter2>`

## File Server

- `list` Lists all uploaded files and their shortlinks.
- `list <hash>` Lists a single uploaded file using `hash`.
- `delete <hash>` Deletes a file using `hash`.
- `up <path>` Uploads a file and returns a shortlink to it.
- `start` Starts the HockIt HTTP server on this session. If called via a TTY, a REPL session will be started to allow the input of additional commands while the HTTP server is running.

## General Configuration

- `config` Lists the current HockIt configuration status.
- `config reset` Resets all configuration settings to default values and unsets all passwords.
- `passwd` Sets the password for uploading/listing via the web GUI; supplying a blank password  unset it and cause some web GUI features to stop working.
- `domain <fqdn>` Sets the `fqdn` for use in generation of shortlink URLs.
- `port <uri>` Binds the HTTP server to `uri`, which can be a port number, host, or socket/handle path.
- `webroot <path>` Serves files from given path via the HTTP server. Requires both read & write permissions. The default webroot is located in `~/.hockit/webroot`

## SSL Configuration

Syntax: `hockit ssl <option> <parameter>`

Running `hockit ssl` without options will check the validity of the current SSL configuration.

- `enable` Enables HTTPS/SSL and attempts to import the SSL PEM certificate & key files when `hockit start` is invoked.
- `disables` Disables HTTPS/SSL and ignores any given certificate/key.
- `cert <path>` Sets the filesystem `path` to the SSL PEM certificate file.
- `cert <unset>` Unsets the filesystem path to the SSL PEM certificate file.
- `key <path>` Sets the filesystem `path` to the SSL PEM private key file.
- `key <unset>` Unsets the filesystem path to the SSL PEM private key file.
- `pass` Sets the passphrase to the SSL PEM private key file via a TTY.
- `pass <passphrase>` Sets the passphrase to the SSL PEM private key file via the standard I/O interface.
- `pass <unset>` Unsets the passphrase to the SSL PEM private key file.


## API Tokens

Syntax: `hockit token <option> <parameter>`

Running `hockit token` without options will list all valid API tokens and their nicknames.

- `list` Lists all API tokens.
- `list <nickname>` Searches for an API token usng `nickname`.
- `revoke <nickname>` Permanently revokes an API token using `nickname` from service, denying all future API requests made with that token.
- `create <nickname>` Creates and returns a new API token and indexes it using `nickname`.

# REST API

Hockit implements a traditional REST API via the Get and Post HTTP request methods; response bodies are in JSON format, and are sometimes omitted in favor of HTTP status codes.

To access the API, you must supply a valid API token in the `Authorization` HTTP request header. API tokens can be generated and revoked via the CLI, see [API Tokens](#api-tokens)

## JSON Response

Tf the HTTP response body is present, it will contain a JSON string with an `error` property and a `data` property. If there was no error, then `error` will be set to `null`.

## Routes

URL Syntax: `my.website.com/<command>/<parameter>`

- `/<hash>` If a file is found which matches the hash, then GET returns the binary data. Returns HTTP error 404 if no file was found.
- `/up` Uploads a file to the server and redirects to `/uploads` to display it. Excpets the request body to contain data of type `multipart/form-data`.
- `/list` Lists all uploaded files and their hashes. Returns an array of objects with the properties `name`, and `hash`.
- `/list/<hash>` Searches for a file using `hash`. Returns an object with the properties `name`, and `hash`.
- `/delete/<hash>` Deletes a file using `hash`. Returns HTTP 200 on success, and HTTP 404 if the file does not exist.
- `/_healthcheck` Simply returns an "OK" string. Useful for monitoring the HTTP server uptime and checking that it is operating as expected.
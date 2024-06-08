
<h1 align="center">
  YT4KIDS
  <br>
  <br>
</h1>

<p align="center">A local instance where you can control the videos your kids can watch</p>

<p align="center">
This started out as a deep dislike of the recommendation engine in youtube when kids were watching.
Now its a fun project to rethink content delivery in such a way that would be safe for children.
</p>

## Features

*	&#x1F5F9; Download and save video's to watch later
* &#x1F5F9; Thumbnails for author/artist and video's stored locally
* &#x1F5F9; Separate admin page for downloading and managing videos
  * &#x1F5F9; Ability to search for video's/channels/both
  * &#x1F5F9; Ability to download individual video with artist info
  * &#x2610; Ability to download a channel
  * &#x2610; Ability to mark channels for checking for new videos
* &#x2610; logins/users for basic access control
* &#x2610; Search local videos
* &#x1F5F9; Play a video streamed in chunks from the backend

## Configuration
The following environment variables are usable either as a `.env` file or passed in.

```bash
# where to store the files
YK_STORAGE_DIR=./storage

# Storage engine for metadata
# TODO: make more than 1!
YK_DB_TYPE=LOKI
# where should the db store
YK_DB_STORAGE_DIR=./storage/db
# loki specific settings
# disk/memory
YK_LOKI_ADAPTER=disk
```

## Development

Download the project locally, start two shells, one for the backend server, the other for the ui.

```bash
# backend express server
# install deps
npm install

# run server in dev mode
npm run dev
```

```bash
## in separate bash shell, run ui:
npm install

# run vite dev with hot reload
npm run dev
```

## Building

Its janky right now, needs fixing. From root project:

```bash
# build
./build.sh

# runs the built container
docker compose up
```

## Links
Projects that helped or inspired

* [Youtube.js](https://github.com/LuanRT/YouTube.js) - Amazing library to interact with the youtube api
* [Svelte](https://svelte.dev/) - Refreshing framework for frontend development (not using sveltekit)
* [Flowbite Svelte](https://flowbite-svelte.com) - The pretty css bits

## Disclaimer
This project is not affiliated with, endorsed, or sponsored by YouTube or any of its affiliates or subsidiaries. All trademarks, logos, and brand names used in this project are the property of their respective owners and are used solely to describe the services provided.

As such, any usage of trademarks to refer to such services is considered nominative use. If you have any questions or concerns, please contact me directly via email.


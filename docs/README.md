# Website

This website is built with [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

`dev_environment.md` and `linux_dev_environment.md` have been moved from `/docs/` to `/docs/docs/`, due to Docusaurus scaffolding.

## Installation

```shell
yarn
```

### Local Development

```shell
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```shell
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Local Deployment

```shell
yarn run serve -- --build --port 80 --host 0.0.0.0
```

If you want to quickly test a production build of the site locally, use the above command. This is not a good practice for public-facing sites.

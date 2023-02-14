## Comm

Comm is the working name of this open source messaging project.

## Repo structure

The whole project is written in Flow-typed Javascript. The code is organized in a monorepo structure using Yarn Workspaces.

- `native` contains the code for the React Native app, which supports both iOS and Android.
- `keyserver` contains the code for the Node/Express server.
- `web` contains the code for the React desktop website.
- `landing` contains the code for the [Comm landing page](https://comm.app).
- `lib` contains code that is shared across multiple other workspaces, including most of the Redux stack that is shared across native/web.

## Dev environment

Note that it’s currently it’s only possible to contribute to this project from macOS. This is primarily due to iOS native development only being supported in macOS.

Check out our [doc on how to set up our dev environment](docs/nix_dev_env.md).

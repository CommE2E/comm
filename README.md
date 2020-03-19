SquadCal is the working name of this open source messaging project. The goal is to create a chat app that:
1. Is oriented around helping people spend time together,
2. Can scale chat threads to dozens or even hundreds of users,
3. Helps people manage and maintain their relationships over time,
4. Is end-to-end encrypted, and
5. Supports extensive personalization/customization of chat threads.

## Repo structure

The whole project is written in Flow-typed Javascript. The code is organized in a monorepo structure using Yarn Workspaces.
- `native` contains the code for the React Native app, which supports both iOS and Android.
- `server` contains the code for the Node/Express server.
- `web` contains the code for the React desktop website.
- `lib` contains code that is shared across multiple other workspaces, including most of the Redux stack that is shared across native/web.

## Dev environment

Note that it’s currently it’s only possible to contribute to this project from macOS. This is primarily due to iOS native development only being supported in macOS.

Check out our [doc on how to set up our dev environment](docs/dev_environment.md).

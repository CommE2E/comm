# Motivation

We use Nix to package all of the dependencies for our dev environment. It does several things for us:

- Enables new devs on macOS or Linux to set up our dev environment with just one command
- Makes sure that everybody on the team is using the same versions of all the tools
- Allows us to isolate development dependencies from affecting the host system

For how Nix package management works, please refer to the official [how Nix works guide](https://nixos.org/guides/how-nix-works.html).

# Supported workflows

Some workflows require additional steps after the Nix installation. These steps are documented in [Workflow prerequisites](#workflow-prerequisites).

| Workflow                        | macOS supported |
| ------------------------------- | --------------- |
| `keyserver` (Node.js)           | ❌              |
| `web` & `landing` (Webpack)     | ❌              |
| `native` iOS (React Native)     | ❌              |
| `native` Android (React Native) | ❌              |
| C++ services                    | ❌ **\***       |
| Rust services                   | ✅              |

**\*** Workflow requires documentation; and it requires the RabbitMQ and AWS/Localstack services to be available.

# Requirements

To set up a dev environment using Nix, you will need a macOS or Linux machine.

# Prerequisites

## Nix package manager

To install and configure the [Nix package manager](https://nixos.org), please run:

```
./scripts/install_nix.sh
```

## Workflow prerequisites

On macOS, [installing Xcode](./nix_mobile_setup.md#xcode) is a prerequisite for all workflows.

- [Web prerequisites](./nix_web_setup.md#nix-web-requisities)
  - [React Dev Tools Chrome extension](./nix_web_setup.md#react-dev-tools-chrome-extension)
  - [Redux Dev Tools Chrome extension](./nix_web_setup.md#redux-dev-tools-chrome-extension)
  - [Flipper (React Native Debugger)](./nix_mobile_setup.md#flipper)
- [Mobile prerequisites](./nix_mobile_setup.md#nix-mobile-prerequisites)
  - [Xcode](./nix_mobile_setup.md#xcode)
    - [Xcode settings](./nix_mobile_setup.md#xcode-settings)
  - [Homebrew](./nix_mobile_setup.md#homebrew)
    - [idb (iOS Development Bridge)](./nix_mobile_setup.md#idb)
    - [Reactotron](./nix_mobile_setup.md#reactotron)
  - [Android Studio](./nix_mobile_setup.md#android-studio)
    - [JDK](./nix_mobile_setup.md#jdk)
    - [Android SDK](./nix_mobile_setup.md#android-sdk)
    - [Android Emulator](./nix_mobile_setup.md#android-emulator)
  - [Flipper (React Native Debugger)](./nix_mobile_setup.md#flipper)

# Development environment

Run `nix develop` to create a dev environment. Nix will handle the installation of all remaining dependencies not mentioned in [Workflow prerequisites](#workflow-prerequisites).

## Development workflows

- [Web workflows](./nix_web_workflows.md#development)
  - [Flow typechecker](./nix_web_workflows.md#flow-typechecker)
  - [Running keysever](./nix_web_workflows.md#running-keyserver)
  - [Running web app](./nix_web_workflows.md#running-web-app)
  - [Running landing page](./nix_web_workflows.md#running-landing-page)
  - [Debugging](./nix_web_workflows.md#debugging)
    - [React Developer Tools](./nix_web_workflows.md#react-developer-tools)
    - [Redux Developer Tools](./nix_web_workflows.md#redux-developer-tools)
    - [Debugging JavaScript](./nix_web_workflows.md#debugging-javascript)
- [Mobile workflows](./nix_mobile_workflows.md#mobile-workflows)
  - [Running mobile app on iOS Simulator](./nix_mobile_workflows.md#running-mobile-app-on-ios-simulator)
  - [Running mobile app on Android Emulator](./nix_mobile_workflows.md#running-mobile-app-on-android-emulator)
  - [Running mobile app on physical iOS devices](./nix_mobile_workflows.md#running-mobile-app-on-physical-ios-devices)
- [Shared workflows](./nix_shared_workflows.md#shared-workflows)
  - [Inspect database with TablePlus](./nix_shared_workflows.md#inspect-database-with-tableplus)
  - [Codegen](./nix_shared_workflows.md#codegen)
    - [Codegen for JSI](./nix_shared_workflows.md#codegen-for-jsi)
    - [Codegen for gRPC](./nix_shared_workflows.md#codegen-for-grpc)
  - [Working with Phabricator](./nix_shared_workflows.md#working-with-phabricator)
    - [Creating a new diff](./nix_shared_workflows.md#creating-a-new-diff)
    - [Updating a diff](./nix_shared_workflows.md#updating-a-diff)
    - [Working with a stack](./nix_shared_workflows.md#working-with-a-stack)
    - [Committing a diff](./nix_shared_workflows.md#committing-a-diff)
  - [Final notes](./nix_shared_workflows.md#final-notes)

## How Nix introduces dependencies to a development environment

Nix installs packages in the Nix store at package-specific paths (e.g. `/nix/store/x7kdiasp...-clang/bin/clang`). When you run `nix develop`, Nix sets environment variables such as `PATH` to expose the binary dependencies to your shell. This model can be extended through shell hooks to support other build toolchains such as `pkg-config`, `cmake`, and many other language specific package managers by simply adding the respective toolchain to `nativeBuildInputs`.

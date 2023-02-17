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
| `keyserver` (Node.js)           | ✅              |
| `web` & `landing` (Webpack)     | ✅              |
| `native` iOS (React Native)     | ✅              |
| `native` Android (React Native) | ✅              |
| C++ services                    | ❌ **\***       |
| Rust services                   | ✅              |

**\*** Workflow requires documentation; and it requires the RabbitMQ and AWS/Localstack services to be available.

# Requirements

To set up a dev environment using Nix, you will need a macOS or Linux machine.

# Prerequisites

## Xcode

For developers using macOS, go to the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) to install Xcode; or if you already have it, update it to the latest version.

Once Xcode is installed, open it up. If you are prompted, follow the instructions to install any [“Additional Required Components”](./nix_mobile_setup.md#xcode-settings)

### Xcode Command Line Tools

For developers using macOS, you need to make sure that the Xcode “Command Line Tools” are installed. You can do this by running:

```
xcode-select --install
```

## Nix package manager

To install and configure the [Nix package manager](https://nixos.org), please run:

```
# Pull down Git repository
git clone git@github.com:CommE2E/comm.git
cd comm

# Install Nix and Comm binary cache
./scripts/install_nix.sh
```

Now either close and reopen your terminal window or re-source your shell configuration file in order to have changes applied.

## Install development dependencies

As a first step, you’ll want to set up the JavaScript environment and pull in all necessary NPM packages. Run the following command:

```
# Create development shell
nix develop

# Install yarn dependencies
yarn cleaninstall
```

## Workflow specific prerequisites

On macOS, [installing Xcode](./nix_mobile_setup.md#xcode) is a prerequisite for all workflows.

- [Web prerequisites](./nix_web_setup.md#nix-web-requisities)
  - [React Dev Tools Chrome extension](./nix_web_setup.md#react-dev-tools-chrome-extension)
  - [Redux Dev Tools Chrome extension](./nix_web_setup.md#redux-dev-tools-chrome-extension)
- [Mobile prerequisites](./nix_mobile_setup.md#nix-mobile-prerequisites)
  - [iOS development](./nix_mobile_setup.md#ios-development)
    - [Xcode settings](./nix_mobile_setup.md#xcode-settings)
  - [Android development](./nix_mobile_setup.md#android-development)
    - [JDK (Java Development Kit)](./nix_mobile_setup.md#jdk)
    - [Android Studio](./nix_mobile_setup.md#android-studio)
    - [Android SDK](./nix_mobile_setup.md#android-sdk)
    - [Android emulator](./nix_mobile_setup.md#android-emulator)
  - [Debugging tools](./nix_mobile_setup.md#debugging-tools)
    - [Reactotron](./nix_mobile_setup.md#reactotron)

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
  - [Working with Phabricator](./nix_shared_workflows.md#working-with-phabricator)
    - [Setup](./nix_shared_workflows.md#setup)
    - [Creating a new diff](./nix_shared_workflows.md#creating-a-new-diff)
    - [Updating a diff](./nix_shared_workflows.md#updating-a-diff)
    - [Working with a stack](./nix_shared_workflows.md#working-with-a-stack)
    - [Committing a diff](./nix_shared_workflows.md#committing-a-diff)
  - [Final notes](./nix_shared_workflows.md#final-notes)

## Using alternate shells with Nix

Alternate shells such as zsh or fish can also be used with Nix. To use an alternate shell, run:

```sh
nix develop -c $SHELL
```

You may also replace the bash shell with the shell of your preference.

```sh
nix develop
exec zsh # or fish
```

## How Nix introduces dependencies to a development environment

Nix installs packages in the Nix store at package-specific paths (e.g. `/nix/store/x7kdiasp...-clang/bin/clang`). When you run `nix develop`, Nix sets environment variables such as `PATH` to expose the binary dependencies to your shell. This model can be extended to support other build toolchains such as pkg-config, CMake, and many other language specific package managers.

# Motivation

We use Nix to package all of the dependencies for our dev environment. It does several things for us:

- Enables new devs on macOS or Linux to set up our dev environment with just one command
- Makes sure that everybody on the team is using the same versions of all the tools
- Allows us to isolate development dependencies from affecting the host system

For how Nix package management works, please refer to the official [how Nix works guide](https://nixos.org/guides/how-nix-works.html).

# Supported workflows

| Workflow                      | Supported on macOS |
| ----------------------------- | ------------------ |
| keyserver (Node.js)           | ❌                 |
| web (Webpack)                 | ❌                 |
| native iOS (React Native)     | ❌                 |
| native Android (React Native) | ❌                 |
| C++ services                  | ❌                 |
| Rust services                 | ✅                 |

# Requirements

To set up a dev environment using Nix, you will need a macOS or Linux machine.

# Prerequisites

## Nix package manager

To install and configure the [Nix package manager](https://nixos.org), please run:

```
./scripts/install_nix.sh
```

# Development Environment

Run `nix develop` to create a dev environment.

## How Nix Introduces Dependencies to a Development Environment

Nix installs packages in the Nix store at package-specific paths (e.g. `/nix/store-x7kdiasp...-clang/bin/clang`). When you run `nix develop`, Nix sets environment variables such as `PATH` to expose the binary dependencies to your shell. This model can be extended through shell hooks to support other build toolchains such as `pkg-config`, `cmake`, and many other language specific package managers by simply adding the repective toolchain to `nativeBuildInputs`.

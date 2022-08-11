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

Go to the NixOS website to install the Nix package manager for [macOS](https://nixos.org/download.html#nix-install-macos) or [Linux](https://nixos.org/download.html).

Nix manages all packages within the Nix store which needs to be located at `/nix`. The store location in integral to how Nix is able to determine the location of packages, and cannot be moved. In addition, `/nix` cannot be a symlink because of the requirement to mount paths for builds. The installation script guides you through the setup process of creating the Nix store and other requirements with minimal interaction.

If you’d like to audit the script to alleviate any security concern, you can view it [here](https://nixos.org/nix/install).

# Configuration

## Nix Flakes

[Nix Flakes](https://nixos.wiki/wiki/Flakes) are the new canonical way to expose Nix packages. The [exposed packages](https://nixos.wiki/wiki/Flakes#Output_schema) can be normal Nix packages, [overlays](https://nixos.wiki/wiki/Overlays), [modules](https://nixos.wiki/wiki/Module), or even [entire systems](https://nixos.wiki/wiki/Flakes#Using_nix_flakes_with_NixOS). The `flake.nix` file is used to communicate what is exposed and the `flake.lock` file is used to ensure that all dependencies are captured in an immutable fashion.

You will need to edit the Nix configuration file to enable Nix Flakes.

```
sudo vim /etc/nix/nix.conf
```

Add the following line to the file:

```
experimental-features = nix-command flakes
```

For use of comm's binary caches, please add yourself as a trusted user. This should reflect what `echo $USER` prints.

```
trusted-users = <user>
# alternatively add groups using `@`
trusted-users = @admin # macOS
trusted-users = @wheel # linux
```

# Development Environment

Run `nix develop` to create a dev environment.

## How Nix Introduces Dependencies to a Development Environment

Nix installs packages in the Nix store at package-specific paths (e.g. `/nix/store-x7kdiasp...-clang/bin/clang`). When you run `nix develop`, Nix sets environment variables such as `PATH` to expose the binary dependencies to your shell. This model can be extended through shell hooks to support other build toolchains such as `pkg-config`, `cmake`, and many other language specific package managers by simply adding the repective toolchain to `nativeBuildInputs`.

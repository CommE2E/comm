# Nix

## Updating Nixpkgs

Nixpkgs is the official package repository for Nix.

The `nixpkgs` input is a reference to the [NixOS/nixpkgs repository](https://github.com/NixOS/nixpkgs/), updating this input will checkout the latest git commit. To update our pin of Nixpkgs:

```
nix flake lock --update-input nixpkgs
```

## Pushing development artifacts to Cachix

Cachix is an easy-to-use cache for Nix packages. Instead of having each developer build Comm-specific packages locally, we can populate those packages in a Cachix cache and pull down the prebuilt packages.

### Authorizing with Cachix

To configure token authorization for Cachix:

```
nix shell nixpkgs#cachix
cachix authtoken <auth token>
```

### Pushing development shell to Cachix

To build and push development artifacts to Cachix:

```
nix build .#devShells.default
cachix push comm ./result
```

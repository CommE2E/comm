# Nix

## Updating Nixpkgs

Nixpkgs is the offical package repository, and provides a large repository of software.

To update our pin of Nixpkgs:

```
nix flake lock --update-input nixpkgs
```

## Pushing development artifacts to Cachix

Some of the software we use has very specific version requirements. These derivations will not be available through Nixpkgs, thus we need to provide them through our own cache.

### Authorizing with Cachix

To setup to auth for cachix:

```
nix shell nixpkgs#cachix
cachix authtoken <auth token>
```

### Pushing development shell to Cachix

To push development artifacts to Cachix:

```
nix build .#devShells.default
cachix push comm ./result
```

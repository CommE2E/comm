{
  description = "Comm flake";

  inputs = {
    utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs, utils, ... }:
    let
      # Overlays allow for extending a package set, in this case, we are
      # extending nixpkgs with our devShell
      localOverlay = import ./nix/overlay.nix;
      overlays = [
        localOverlay
      ];

      # Since we build for many systems (e.g. aarch64, x86_64-linux), we
      # create a helper function to help facilitate instantiation of the related
      # package set
      pkgsForSystem = system: import nixpkgs {
        inherit overlays system;
      };

    # utils.lib.eachSystem helps create a result set of expected flake outputs
    # of the form <output>.<system>
    # https://github.com/numtide/flake-utils#usage for more examples
    in utils.lib.eachSystem [ "x86_64-linux" "x86_64-darwin" "aarch64-darwin" ] (system: rec {
      legacyPackages = pkgsForSystem system;
      inherit (legacyPackages) devShells;
    }) // {
      # these outputs will lack the system suffix (e.g.
      # devShell.aarch64-darwin), thus should be system agnostic such as
      # overlays or utility functions.
      overlays.default = localOverlay;
    };

    # Flake specific additions to what is found in /etc/nix/nix.conf
    # Add comm binary cache to avoid our pinned packages from needing
    # to be built by any consumer
    nixConfig = {
      extra-substituters = [ "https://comm.cachix.org" ];
      extra-trusted-public-keys = [
        "comm.cachix.org-1:70RF31rkmCEhQ9HrXA2uXcpqQKGcUK3TxLJdgcUCaA4="
      ];
    };
}

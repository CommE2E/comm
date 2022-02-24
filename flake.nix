{
  description = "Comm flake";

  inputs = {
    utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs, utils, ... }:
    let
      # put devShell and any other required packages into local overlay
      localOverlay = import ./nix/overlay.nix;
      overlays = [
        localOverlay
      ];

      pkgsForSystem = system: import nixpkgs {
        # if you have additional overlays, you may add them here
        overlays = [
          localOverlay # this should expose devShell
        ];
        inherit system;
        config.android_sdk.accept_license = true;
      };
    # https://github.com/numtide/flake-utils#usage for more examples
    in utils.lib.eachSystem [ "x86_64-linux" "x86_64-darwin" "aarch64-darwin" ] (system: rec {
      legacyPackages = pkgsForSystem system;
      inherit (legacyPackages) devShell;
  }) // {
    inherit overlays;
    overlay = nixpkgs.lib.composeManyExtensions overlays;
  };
}

prev: final: {
  # add packages meant for just this repository
  androidDevEnv = prev.callPackage ./android-dev-env.nix { };

  devShell = final.callPackage ./dev-shell.nix { };
}

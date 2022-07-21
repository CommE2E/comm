{ rustPlatform
, comm-src
, pkg-config
, openssl
}:

let
  notifications-dir = "services/tunnelbroker/rust-notifications";
  # pull version from Cargo.toml
  version = let
    tomlFile = "${comm-src}/${notifications-dir}/Cargo.toml";
    tomlContents = builtins.readFile tomlFile;
    matches = builtins.match "version = \"\([0-9\.]*)\"" tomlContents;
  in
    if (builtins.isList matches) then
      builtins.head matches
    else
      "unknown";
in
  rustPlatform.buildRustPackage {
    pname = "tunnelbroker-rust-notifications";
    inherit version;

    src = comm-src;

    prePatch = ''
      cd ${notifications-dir}
    '';

    nativeBuildInputs = [
      pkg-config
    ];

    buildInputs = [
      openssl
    ];

    # Pulls cargo dependencies into nix store
    cargoLock.lockFile = "${comm-src}/${notifications-dir}/Cargo.lock";
    cargoRoot = notifications-dir;
  }

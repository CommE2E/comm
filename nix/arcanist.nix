{ stdenv
, lib
, cacert
, fetchFromGitHub
, installShellFiles
, makeWrapper
, php80
, python3
, which
}:

stdenv.mkDerivation {
  pname = "arcanist";
  version = "20220517";

  src = fetchFromGitHub {
    owner = "phacility";
    repo = "arcanist";
    rev = "85c953ebe4a6fef332158fd757d97c5a58682d3a";
    sha256 = "0x847fw74mzrbhzpgc4iqgvs6dsf4svwfa707dsbxi78fn2lxbl7";
  };

  # These need to be in PATH during the build
  nativeBuildInputs = [ php80 python3 installShellFiles makeWrapper ];

  # Since we are exporting a script, we do not need to do an actual "build"
  doBuild = false;

  installPhase = ''
    # Copy arcanist contents
    mkdir -p $out/libexec $out/bin
    cp -R . $out/libexec/arcanist

    # provide a recent up-to-date certificate bundle for ssl
    ln -sf ${cacert}/etc/ssl/certs/ca-bundle.crt \
      $out/libexec/arcanist/resources/ssl/default.pem

    # The canonical way to handle shebangs with nix is to use `patchShebangs`
    # which will resolve to the absolute path of the interpreter.
    # However, darwin will fail to interpret a shebang of 80 characters or
    # longer for the first argument. Nix store paths hover around this limit.
    # See https://github.com/NixOS/nixpkgs/issues/93609 for related issue.
    cat << WRAPPER > $out/bin/arc
    #!$shell -e
    export PATH=${lib.makeBinPath [ python3 php80 which]}''${PATH:+':'}\$PATH
    exec ${php80}/bin/php $out/libexec/arcanist/bin/arc "\$@"
    WRAPPER

    chmod +x $out/bin/arc

    # Add shell completion for bash
    $out/bin/arc shell-complete --generate --
    installShellCompletion --cmd arc --bash \
      $out/libexec/arcanist/support/shell/rules/bash-rules.sh
  '';

  # Ensure `arc` is able to run without failing
  doInstallCheck = true;
  installCheckPhase = ''
    $out/bin/arc help diff -- > /dev/null
  '';

  meta = {
    description = "Command line interface to Phabricator";
    homepage = "http://phabricator.org";
    license = lib.licenses.asl20;
    platforms = lib.platforms.unix;
  };
}

{ stdenv
, lib
, cacert
, fetchFromGitHub
, installShellFiles
, makeWrapper
, php81
, python3
, which
}:

stdenv.mkDerivation {
  pname = "arcanist";
  version = "20230530";

  src = fetchFromGitHub {
    owner = "phacility";
    repo = "arcanist";
    rev = "e50d1bc4eabac9c37e3220e9f3fb8e37ae20b957";
    sha256 = "13hng5xjn4whg1ichgk36lspmmmd9fdsv8a8mj5hq05fl2qx3qdv";
  };

  patches = [ ./arcanist-php81-fix.patch ];

  # These need to be in PATH during the build
  nativeBuildInputs = [ php81 python3 installShellFiles makeWrapper ];

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
    export PATH=${lib.makeBinPath [ python3 php81 which]}''${PATH:+':'}\$PATH
    exec ${php81}/bin/php $out/libexec/arcanist/bin/arc "\$@"
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

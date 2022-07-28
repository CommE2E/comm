# An overlay allows for a package set to be extended with new or modified packages

# `final` refers to the package set with all overlays applied.
# This allows for added or modified packages to be referenced with
# all relevant changes
final:

# `prev` refers to the previous package set before this current overlay is applied.
# This is cheaper for nix to evaluate, thus should be prefered over final when possible.
prev:

{
  # add packages meant for just this repository
  amqp-cpp = prev.callPackage ./amqp-cpp.nix { };

  protobuf_3_15_cmake = prev.callPackage ./protobuf_3_15.nix { };

  devShell = final.callPackage ./dev-shell.nix { };

  mysql-down = prev.callPackage ./mysql-down-linux.nix { };

  mysql-up = prev.callPackage ./mysql-up-linux.nix { };

  arcanist = prev.arcanist.override(_: {
    # php8.1 will cause warnings to throw as exceptions
    # around calling strlen() with null
    php = prev.php80;
  });

  olm = prev.olm.overrideAttrs(oldAttrs: {
    # *.hh files aren't meant to be used externally
    # so we patch installation to add it
    postInstall = ''
      cp \
        $NIX_BUILD_TOP/${oldAttrs.src.name}/include/olm/*.h* \
        ''${!outputDev}/include/olm
    '';
  });

  # 16.14 now requires experimental import assertions syntax, pin to 16.13
  # https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V16.md
  nodejs-16_x = prev.nodejs-16_x.overrideAttrs (oldAttrs: rec {
    version = "16.13.0";
    name = "nodejs-${version}";

    src = prev.fetchurl {
      url = "https://nodejs.org/dist/v${version}/node-v${version}.tar.xz";
      sha256 = "sha256-MhFLPcOUXtD5X4vDO0LGjg7xjECMtWEiVyoWPZB+y8w=";
    };
  });

  # Ensure that yarn is using the pinned version
  yarn = prev.yarn.override (_: {
    nodejs = final.nodejs-16_x;
  });
}

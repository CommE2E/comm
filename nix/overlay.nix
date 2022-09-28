# An overlay allows for a package set to be extended with new or modified packages

# `final` refers to the package set with all overlays applied.
# This allows for added or modified packages to be referenced with
# all relevant changes
final:

# `prev` refers to the previous package set before this current overlay is applied.
# This is cheaper for nix to evaluate, thus should be prefered over final when possible.
prev:

{
  # Patch aws-sdk-cpp to automatically pick up header location
  # specific to nixpkgs, as nixpkgs separates build-time and runtime
  # depencenies (a saving of 400MB in header + generated files).
  # In the case of c and c++, this means the header files are
  # located in a separate directory from the libraries.
  #
  # From a developer perspective, this avoids having to manually specify
  # the header location with `-DAWS_CORE_HEADER_FILE` each time
  # one invokes `cmake` on the command line when using
  # `find_package(AWSSDK COMPONENTS [comps])`
  #
  # For more information, see:
  # - aws-sdk-cpp issue: https://github.com/aws/aws-sdk-cpp/issues/2009
  # - Nixpkgs fix: https://github.com/NixOS/nixpkgs/pull/182918
  aws-sdk-cpp = (prev.aws-sdk-cpp.overrideAttrs(oldAttrs:{
    postPatch = oldAttrs.postPatch + ''
      substituteInPlace cmake/AWSSDKConfig.cmake \
        --replace 'C:/AWSSDK/''${AWSSDK_INSTALL_INCLUDEDIR}/aws/core' \
          'C:/AWSSDK/''${AWSSDK_INSTALL_INCLUDEDIR}/aws/core"
          "${placeholder "dev"}/include/aws/core'
    '';
  })).override {
    # avoid rebuildilng all 300+ apis
    apis = [ "core" "s3" "dynamodb" ];
  };

  # add packages meant for just this repository
  amqp-cpp = prev.callPackage ./amqp-cpp.nix { };

  arcanist = prev.callPackage ./arcanist.nix { };

  better-prompt = prev.callPackage ./better-prompt.nix { };

  # c-ares is used to bootstrap curl, so cmake is not available in the default
  # build
  c-ares_cmake-config = prev.c-ares.overrideAttrs(o: {
    nativeBuildInputs = (o.nativeBuildInputs or []) ++ [ prev.cmake ];
  });

  protobuf_3_15_cmake = prev.callPackage ./protobuf_3_15.nix { };

  devShells.default = final.callPackage ./dev-shell.nix { };
  devShell = final.devShells.default;

  localstack-up = prev.callPackage ./localstack-up.nix { };
  # Make our version of mariadb the default everywhere
  mariadb = prev.mariadb_108;

  mariadb-up = prev.callPackage ./mariadb-up-mac.nix { };

  mysql-down = prev.callPackage ./mysql-down-linux.nix { };

  mysql-up = prev.callPackage ./mysql-up-linux.nix { };

  redis-up = prev.callPackage ./redis-up-mac.nix { };

  olm = prev.olm.overrideAttrs(oldAttrs: {
    # *.hh files aren't meant to be used externally
    # so we patch installation to add it
    postInstall = ''
      cp \
        $NIX_BUILD_TOP/${oldAttrs.src.name}/include/olm/*.h* \
        ''${!outputDev}/include/olm
    '';
  });

  corrosion = prev.corrosion.overrideAttrs(_: {
    patches = [
      # Fix logic around finding cargo and rustc when not managed by rustup
      (prev.fetchpatch {
        url = "https://github.com/corrosion-rs/corrosion/commit/d5330b3f03c7abb4e4da71e35654fa03ecb778bb.patch";
        sha256 = "sha256-jrA30bWNWprkqCiedf+xL7GlR9+9jgOyKAoTPVKkB9c=";
      })
    ];
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

    # Nixpkgs applies two patches for 16.15. One patch is for finding headers
    # needed for v8 on darwin using apple_sdk 11; the other patch fixes crashes
    # related cache dir defaulting to using `$HOME` without asserting that
    # it exists.
    #
    # However, 16.13 doesn't need the second patch, as the regression which
    # caused it was introduced after 16.13. This ends up being a no-op. But
    # nix will still try to apply the patch and fail with "this patch has
    # already been applied".
    #
    # For more context, see (https://github.com/npm/cli/pull/5197)
    #
    # lib.head will select the first element in an array
    patches = [
      (prev.lib.head oldAttrs.patches)
    ];
  });

  # Ensure that yarn is using the pinned version
  yarn = prev.yarn.override (_: {
    nodejs = final.nodejs-16_x;
  });
}

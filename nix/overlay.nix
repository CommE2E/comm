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

  better-prompt = prev.callPackage ./better-prompt.nix { };

  # c-ares is used to bootstrap curl, so cmake is not available in the default
  # build
  c-ares_cmake-config = prev.c-ares.overrideAttrs(o: {
    nativeBuildInputs = (o.nativeBuildInputs or []) ++ [ prev.cmake ];
  });

  devShells.default = final.callPackage ./dev-shell.nix { };
  devShell = final.devShells.default;

  localstack-down = prev.callPackage ./localstack-down.nix { };

  localstack-up = prev.callPackage ./localstack-up.nix { };

  mariadb-up = final.callPackage ./mariadb-up-mac.nix { };

  mysql-down = prev.callPackage ./mysql-down-linux.nix { };

  mysql-up = prev.callPackage ./mysql-up-linux.nix { };

  redis-up = prev.callPackage ./redis-up-mac.nix { };

  rabbitmq-up = prev.callPackage ./rabbitmq-up-mac.nix { };
}

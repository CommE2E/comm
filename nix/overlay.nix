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

  devShell = final.callPackage ./dev-shell.nix { };
}

{ lib
, stdenv
, powerline
, powerline-fonts
, shellcheck
, writeTextFile
, runtimeShell
}:

# Normally we would want to use writeShellApplications for scripts, however,
# since file will be sourced, we do not want to inherit 'set -euo pipefail'
# as this will cause the development shell to exit for any failed command
writeTextFile rec {
  name = "better-prompt";
  destination = "/bin/${name}";
  executable = true;
  text = ''
    #!${runtimeShell}

    PATH="${powerline}/bin":"''${PATH}"
    powerline_fonts="${powerline-fonts}"
    powerline_root="${powerline}"

    source "${./start-powerline.sh}"
  '';

  checkPhase = ''
    # Have bash assert that the script can be parsed
    # This is what stdenv.shellDryRun is in nixpkgs
    "$shell" -n -O extglob "$target"
    # Need to pass -x so that shellcheck will source external files
    "${shellcheck}/bin/shellcheck" -x "$target"
  '';
}

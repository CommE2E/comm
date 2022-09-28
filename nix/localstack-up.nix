{ lib
, localstack
, writeShellApplication
}:

# writeShellApplication is a "writer helper" which
# will create a shellchecked executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
writeShellApplication {
  name = "localstack-up";
  text = ''
    # Avoid localstack attempt to write in the nix store
    XDG_DATA_HOME=''${XDG_DATA_HOME:-$HOME/.local/share}
    export FILESYSTEM_ROOT=''${XDG_DATA_HOME}/localstack/filesystem

    # Since docker is installed outside of nix, need to ensure that it was
    # installed impurely
    if ! command -v docker > /dev/null; then
      echo "Please install docker in order to use localstack" >&2
      exit 1
    fi

    # The 'localstack status' command will poll foever if you have a newer
    # docker cli, so instead use docker ps + grep to determine running container
    if ! docker ps | grep localstack &> /dev/null; then
      echo "Starting localstack..." >&2
      ${localstack}/bin/localstack start \
        --detached \
        --docker \
        --no-banner > /dev/null
    else
      echo "localstack is already running, skipping localstack initialization"
    fi

    # Explicitly exit this script so the parent shell can determine
    # when it's safe to return control of terminal to user
    exit 0
  '';
}

{ lib
, writeShellScriptBin
}:

# writeShellScriptBin is a "writer helper" which
# will create an executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
writeShellScriptBin "mysql-down" ''
  set -euo pipefail

  echo "Attempting to stop user MySQL server instance" >&2
  systemctl stop --user comm-mysql

  echo "Succesfully killed" >&2
''

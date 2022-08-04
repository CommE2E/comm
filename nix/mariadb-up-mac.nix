{ lib
, openssl
, mariadb
, writeShellScriptBin
, writeTextFile
}:

let
  # User directory can't be resolved from the plist file.
  # Use small script executed by bash to have a normal shell environment.
  mariadb-entrypoint = writeShellScriptBin "mariadb-init" ''
    MARIADB_DIR=''${XDG_DATA_HOME:-$HOME/.local/share}/MariaDB
    ${mariadb}/bin/mariadbd \
      --socket "$MARIADB_DIR"/mysql.socket \
      --datadir "$MARIADB_DIR"
  '';

  plist-file = writeTextFile {
    name = "app.comm.mariadb.plist";
    text = ''
      <?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
      "http://www.apple.com/DTDs/PropertyList-1.0.dtd">

      <plist version="1.0">
      <dict>
        <key>Label</key>
        <string>app.comm.mariadb</string>

        <key>Program</key>
        <string>${mariadb-entrypoint}/bin/mariadb-init</string>

        <key>RunAtLoad</key>
        <true/>

      </dict>
      </plist>
    '';
  };

  mariadb-version = let
    versions = lib.versions;
  in "${versions.major mariadb.version}.${versions.minor mariadb.version}";

# writeShellScriptBin is a "writer helper" which
# will create an executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
in writeShellScriptBin "mariadb-up" ''
  set -xeuo pipefail

  # "$HOME/Library/Application Support/<app>" is the canonical path to use
  # on darwin for storing user data for installed applications.
  # However, mysql and mariadb don't quote paths in the mariadb-safe script,
  # so use XDG conventions and hope $HOME doesn't have a space.
  MARIADB_DATA_HOME="''${XDG_DATA_HOME:-$HOME/.local/share}/MariaDB"

  USER_SERVICES=~/Library/LaunchAgents
  MARIADB_SERVICE="$USER_SERVICES"/app.comm.mariadb.plist

  if [[ ! -d "$MARIADB_DATA_HOME"/mysql ]]; then
    # mysql directory should exist if MariaDB has been initialized
    echo "Initializing MariaDB database at $MARIADB_DATA_HOME" >&2
    ${lib.getBin mariadb}/bin/mariadb-install-db \
      --datadir="$MARIADB_DATA_HOME" \
      --auth-root-authentication-method=socket

    needsInit=1
  fi

  needsLoad=

  # check if service was previously installed
  if [[ ! -r "$MARIADB_SERVICE" ]]; then
    needsLoad=1
  fi

  # Install the service unit file into the default launchd location
  rm "$MARIADB_SERVICE"
  cp ${plist-file} "$MARIADB_SERVICE"
  chmod 644 "$MARIADB_SERVICE"

  # Conditionally register service with launchctl
  launchctl load -w "$MARIADB_SERVICE"

  # Start MariaDB
  echo "Starting MariaDB server as user service: app.comm.mariadb"
  launchctl start app.comm.mariadb

  # Initialize Comm user, database, and secrets file for MariaDB
  if [[ -n "''${needsInit:-}" ]]; then
    PASS=$(${lib.getBin openssl}/bin/openssl rand -hex 6)

    # Connecting through socket doesn't require a password
    userCount=$(mysql -u $UID -Bse "SELECT COUNT(1) FROM mysql.user WHERE user = 'comm';")
    if [[ "$userCount" -eq 0 ]]; then
      echo "Creating comm user and database for MariaDB" >&2

      mariadb -u $USER --password="" \
        -e"CREATE DATABASE comm; CREATE USER comm@localhost IDENTIFIED BY '"$PASS" GRANT ALL ON comm.* TO comm@localhost;"
      echo "Comm user and database has been created!" >&2
    fi

    # Assume this was ran from git repository
    PRJ_ROOT=$(git rev-parse --show-toplevel)
    KEYSERVER_DB_CONFIG="$PRJ_ROOT"/keyserver/secrets/db_config.json

    echo "Writing connection information to $KEYSERVER_DB_CONFIG" >&2
    mkdir -p "$(basename $KEYSERVER_DB_CONFIG)"
    cat <<< EOF > "$KEYSERVER_DB_CONFIG"
    {
      "host": "localhost",
      "user": "comm",
      "password": "$PASS",
      "database": "comm",
      "dbType": "mariadb${mariadb-version}"
    }
  fi

  echo "" >&2
  echo 'View MariaDB Logs: tail -f /tmp/mariadb.stdout # or .stderr' >&2
  echo "Kill MariaDB server: mariadb-down" >&2
''

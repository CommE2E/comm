{ lib
, gnused
, openssl
, mariadb
, writeShellApplication
, writeTextFile
}:

let
  # Use small script executed by bash to have a normal shell environment.
  mariadb-entrypoint = writeShellApplication {
    name = "mariadb-init";
    text = ''
      MARIADB_DIR=''${XDG_DATA_HOME:-$HOME/.local/share}/MariaDB

      echo "View MariaDB logs: tail -f $MARIADB_DIR/logs" >&2
      echo "Kill MariaDB server: pkill mariadbd" >&2

      # Explicitly close fd3 to prevent `direnv` from hanging
      # (https://linear.app/comm/issue/ENG-3254/remove-wait-logic-in-nix-develop)
      exec 3>&-

      # 'exec' allows for us to replace bash process with MariaDB
      exec "${mariadb}/bin/mariadbd" \
        --socket "$MARIADB_DIR"/mysql.sock \
        --datadir "$MARIADB_DIR" \
        --innodb-ft-min-token-size=1 \
        --innodb-ft-enable-stopword=0 \
        &> "$MARIADB_DIR"/logs
    '';
  };

  mariadb-version = let
    versions = lib.versions;
  in "${versions.major mariadb.version}.${versions.minor mariadb.version}";

  # Small boiler-plate text file for us to write for keyserver
  db_config_template = writeTextFile {
    name = "db-config";
    text = ''
      {
        "host": "localhost",
        "user": "comm",
        "password": "PASS",
        "database": "comm",
        "dbType": "mariadb${mariadb-version}"
      }
    '';
  };

# writeShellApplication is a "writer helper" which
# will create a shellchecked executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
in writeShellApplication {
  name = "mariadb-up";
  text = ''
    # "$HOME/Library/Application Support/<app>" is the canonical path to use
    # on darwin for storing user data for installed applications.
    # However, mysql and mariadb don't quote paths in the mariadbd script,
    # so use XDG conventions and hope $HOME doesn't have a space.
    MARIADB_DATA_HOME="''${XDG_DATA_HOME:-$HOME/.local/share}/MariaDB"
    MARIADB_PIDFILE="$MARIADB_DATA_HOME"/mariadb.pid
    export MYSQL_UNIX_PORT="$MARIADB_DATA_HOME"/mysql.sock

    if [[ ! -d "$MARIADB_DATA_HOME"/mysql ]]; then
      # mysql directory should exist if MariaDB has been initialized
      echo "Initializing MariaDB database at $MARIADB_DATA_HOME" >&2
      "${lib.getBin mariadb}/bin/mariadb-install-db" \
        --datadir="$MARIADB_DATA_HOME" \
        --auth-root-authentication-method=socket
    fi

    "${../scripts/start_comm_daemon.sh}" \
      mariadbd \
      MariaDB \
      "${mariadb-entrypoint}/bin/mariadb-init" \
      "$MARIADB_PIDFILE"

    if [[ ! -S "$MYSQL_UNIX_PORT" ]]; then
      echo "Waiting for MariaDB to come up"
      while [[ ! -S "$MYSQL_UNIX_PORT" ]]; do sleep 1; done
    fi

    # Assume this was run from git repository
    PRJ_ROOT=$(git rev-parse --show-toplevel)
    KEYSERVER_DB_CONFIG="$PRJ_ROOT"/keyserver/secrets/db_config.json

    # Check if database exists
    commDBCount=$("${lib.getBin mariadb}/bin/mariadb" -u "$USER" \
      -Bse "SELECT COUNT(1) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'comm';"
    )
    if [[ "$commDBCount" -eq 0 ]]; then
      "${lib.getBin mariadb}/bin/mariadb" -u "$USER" \
        -Bse "CREATE DATABASE comm"
    fi

    # Initialize comm user, database, and secrets file for MariaDB
    # Connecting through socket doesn't require a password
    userCount=$("${lib.getBin mariadb}/bin/mariadb" -u "$USER" \
      -Bse "SELECT COUNT(1) FROM mysql.user WHERE user = 'comm';"
    )
    if [[ "$userCount" -eq 0 ]]; then
      echo "Creating comm user" >&2
      "${lib.getBin mariadb}/bin/mariadb" -u "$USER" \
        -Bse "CREATE USER comm@localhost;
              GRANT ALL ON "'comm.*'" TO comm@localhost;"
    fi

    if [[ ! -f "$KEYSERVER_DB_CONFIG" ]]; then
      echo "Writing connection information to $KEYSERVER_DB_CONFIG" >&2
      mkdir -p "$(dirname "$KEYSERVER_DB_CONFIG")"

      PASS=$("${lib.getBin openssl}/bin/openssl" rand -hex 6)

      "${lib.getBin mariadb}/bin/mariadb" -u "$USER" \
        -Bse "ALTER USER comm@localhost IDENTIFIED BY '$PASS'"
      # It's very difficult to write json from bash, just copy a nix
      # file then use sed to subsitute
      cp "${db_config_template}" "$KEYSERVER_DB_CONFIG"
      chmod +w "$KEYSERVER_DB_CONFIG" # Nix files are read-only
      "${gnused}/bin/sed" -i -e "s|PASS|$PASS|g" "$KEYSERVER_DB_CONFIG"
    fi

    # Explicitly exit this script so the parent shell can determine
    # when it's safe to return control of terminal to user
    exit 0
  '';
}

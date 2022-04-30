{ lib
, writeShellScriptBin
, writeTextFile
, mysql57
}:

let
  # This will create a comm-mysql.service meant to be consumed by systemd as a user unit file
  # Settings:
  #  port = 3306
  #  datadir = ~/.cache/mysql
  #  socket = /run/user/1000/mysql-socket/mysql.sock
  mysql-user-service-unit = writeTextFile {
    name = "comm-mysql";
    text = ''
      [Unit]
      Description=MySQL Server

      [Service]
      ExecStart=${lib.getBin mysql57}/bin/mysqld --port 3306 --datadir=%h/.cache/mysql --socket=%t/mysql-socket/mysql.sock
      Restart=on-failure
      ProtectHome=read-only
      ProtectSystem=strict
      PrivateTmp=true

      [Install]
      WantedBy=default.target
    '';
    destination = "/comm-mysql.service";

  };
in

# writeShellScriptBin is a "writer helper" which
# will create an executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
writeShellScriptBin "mysql-up" ''
  set -euo pipefail

  mkdir -p ''${XDG_CACHE_HOME:-$HOME/.cache}/mysql ''${XDG_RUNTIME_DIR:-/run/user/$UID}/mysql-socket

  if [[ ! -d ''${XDG_CACHE_HOME:-$HOME/.cache}/mysql/mysql ]]; then
    # ~/.cache/mysql/mysql should exist if mysql has been initialized
    echo "Initializing MySQL database at ''${XDG_CACHE_HOME:-$HOME/.cache}/mysql" >&2
    ${lib.getBin mysql57}/bin/mysqld --initialize-insecure --datadir=''${XDG_CACHE_HOME:-$HOME/.cache}/mysql
  fi

  needsReload=

  # check if service was installed
  if [[ ! -r "''${XDG_CONFIG_DIR:-$HOME/.config}/systemd/user/comm-mysql.service" ]]; then
    needsReload=1
  fi

  # Install the service unit file into the default systemd location
  ln -sf ${mysql-user-service-unit}/comm-mysql.service ''${XDG_CONFIG_DIR:-$HOME/.config}/systemd/user/comm-mysql.service

  # Conditionally enable unit file
  [[ -n "$needsReload" ]] && systemctl --user daemon-reload

  # Start mysql
  echo "Starting MySQL server as user service: comm-mysql"
  systemctl start --user comm-mysql.service

  # Initialize Comm user and database for MySQL
  userCount=$(mysql -u root --password="" -Bse "SELECT COUNT(1) FROM mysql.user WHERE user = 'comm';")
  if [[ "''$userCount" -eq 0 ]]; then
    echo "Creating comm user and database for mysql" >&2
    echo -n "Please enter a password for new comm user: " >&2
    read -rs password

    mysql -u root --password="" -e"CREATE DATABASE comm; CREATE USER comm@localhost IDENTIFIED BY '"$password"'; GRANT ALL ON comm.* TO comm@localhost;"
    echo "Comm user and database has been created!" >&2
  fi

  echo "" >&2
  echo "View MySQL Logs: journalctl -f --user-unit comm-mysql" >&2
  echo "Kill MySQL server: nix run .#mysql-down" >&2
''

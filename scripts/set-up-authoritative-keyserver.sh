#!/usr/bin/env bash

PRJ_ROOT="$(git rev-parse --show-toplevel)"

user_credentials_file="$PRJ_ROOT/keyserver/secrets/user_credentials.json"

set_up_or_abort() {
  read -t 60 -r -p "Do you want to set up a new authoritative keyserver? (y/N) " user_input
    
  if [[ $user_input != "Y" && $user_input != "y" ]]; then
    exit 1
  fi

  if ! (mysql -u "$USER" -Bse "USE comm;" 2>/dev/null); then
    echo "Database comm doesn't exist. Please re-enter 'nix develop'"
    exit 1
  fi

  num_of_tables=$(mysql -u "$USER" -Bse "USE comm; SHOW TABLES;" | wc -l);

  if [[ "$num_of_tables" -gt 0 ]]; then
    # Create backup db and move all tables from comm
    timestamp=$(date +%s)
    db_version_name="comm_backup$timestamp"
    echo "backup db name: $db_version_name"

    mysql -u "$USER" -Bse "CREATE DATABASE $db_version_name;"\
      -Bse "GRANT ALL ON $db_version_name"'.*'" TO comm@localhost;"

    for table in $(mysql -u "$USER" -Bse "USE comm; SHOW TABLES FROM comm;"); do 
      mysql -u "$USER" -Bse "USE comm; RENAME TABLE comm.$table TO $db_version_name.$table;"; 
    done;
  fi

  node "$PRJ_ROOT"/scripts/set-user-credentials.js "$PRJ_ROOT"
}

if [[ -n "$BUILDKITE" || -n "$GITHUB_ACTIONS" ]]; then
  exit
fi

if grep -q '"usingIdentityCredentials":.*true' "$user_credentials_file"; then    
  if ! (mysql -u "$USER" -Bse "USE comm; SELECT * FROM metadata" 2>/dev/null | grep "db_version">/dev/null); then
    echo -e "'usingIdentityCredentials' is set to true, but the database is not set up.\n" \
      "This was likely caused by the keyserver failing to login with the provided credentials,"\
      "or the keyserver never being run"
    set_up_or_abort
  fi
else
  echo "'usingIdentityCredentials' is missing or set to false in user_credentials.json."
  set_up_or_abort
fi

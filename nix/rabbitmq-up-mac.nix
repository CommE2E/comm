{ lib
, rabbitmq-server
, writeShellApplication
}:

let
  # Use small script executed by bash to have a normal shell environment.
  rabbitmq-entrypoint = writeShellApplication {
    name = "rabbitmq-init";
    text = ''
      source ${../scripts/source_development_defaults.sh}
      # RabbitMQ is mostly configured through environment variables
      # located in scripts/source_development_defaults.sh
      mkdir -p "$RABBITMQ_LOG_BASE"

      echo "View RabbitMQ logs: tail -f $RABBITMQ_LOGS" >&2
      echo "Kill RabbitMQ server: pkill rabbitmq-server beam.smp" >&2

      # 'exec' allows for us to replace bash process with RabbitMQ
      exec "${rabbitmq-server}/bin/rabbitmq-server" \
        > "$RABBITMQ_LOG_BASE/startup.log"
    '';
  };

# writeShellApplication is a "writer helper" which
# will create a shellchecked executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
in writeShellApplication {
  name = "rabbitmq-up";
  text = ''
    RABBITMQ_HOME=''${XDG_DATA_HOME:-$HOME/.local/share}/RabbitMQ
    RABBITMQ_PIDFILE=''${RABBITMQ_HOME}/rabbitmq.pid

    "${../scripts/start_comm_daemon.sh}" \
      rabbitmq-server \
      RabbitMQ \
      "${rabbitmq-entrypoint}/bin/rabbitmq-init" \
      "$RABBITMQ_PIDFILE"

    # Explicitly exit this script so the parent shell can determine
    # when it's safe to return control of terminal to user
    exit 0
  '';
}

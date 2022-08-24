{ lib
, rabbitmq-server
, writeShellApplication
}:

# writeShellApplication is a "writer helper" which
# will create a shellchecked executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
writeShellApplication {
  name = "rabbitmq-up";
  runtimeInputs = [ rabbitmq-server ];
  text = ''
    RABBITMQ_HOME=''${XDG_DATA_HOME:-$HOME/.local/share}/RabbitMQ
    RABBITMQ_PIDFILE=''${RABBITMQ_HOME}/rabbitmq.pid

    "${../scripts/start_comm_daemon.sh}" \
      rabbitmq-server \
      RabbitMQ \
      "${../scripts/start_rabbitmq.sh}" \
      "$RABBITMQ_PIDFILE"

    # Explicitly exit this script so the parent shell can determine
    # when it's safe to return control of terminal to user
    exit 0
  '';
}

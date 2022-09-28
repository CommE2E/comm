{ lib
, localstack
, writeShellApplication
}:

# writeShellApplication is a "writer helper" which
# will create a shellchecked executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
writeShellApplication {
  name = "localstack-up";
  # Docker must be installed outside of the development shell, so only
  # pass localstack to script
  runtimeInputs = [ localstack ];
  text = builtins.readFile ../scripts/localstack_up.sh;
}

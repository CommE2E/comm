{ lib
, writeShellApplication
}:

# writeShellApplication is a "writer helper" which
# will create a shellchecked executable shell script located in $out/bin/<name>
# This shell script will be used to allow for impure+stateful actions
writeShellApplication {
  name = "localstack-down";
  text = builtins.readFile ../scripts/localstack_down.sh;
}

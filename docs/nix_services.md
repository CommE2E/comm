# Services

At the moment, our services can be built and run on Linux and macOS.

# Development prerequisites

## Docker

Docker is used to run localstack, which emulates AWS for local development. Please use the official [docker install](https://docs.docker.com/desktop/).

# Production prerequisites

## AWS

Some of our services access AWS resources via the AWS C++ SDK. To access these resources, you'll need to configure the `~/.aws/credentials` and `~/.aws/config` files correctly on your host machine. Instructions for setting these configuration files can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).

We recommend running `aws configure`, which will prompt you for the necessary configuration values.

# Building and testing

## C++ services

For backup, blob, and tunnelbroker services, the service is built as a CMake project:

```
cd services/<service>
cmake -Bbuild -S. .
make -C build

# tests
./build/bin/runTests
```

## Rust services

For identity service, the service can be built as a cargo project:

```
cd services/identity
cargo build

# tests
cargo test
```

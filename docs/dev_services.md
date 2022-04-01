# Requirements

At the moment, our services can be built and run on Linux and macOS via Docker. Unfortunately, Windows is not supported at this time. You’ll ideally want a machine with at least 16 GiB of RAM because running a Docker container can consume up to 4 GiB of RAM.

We use Ubuntu as the base Docker image for services.

# Prerequisites

## Docker

To build and run the services you need to install [Docker](https://docs.docker.com/desktop/) and [Docker Compose](https://docs.docker.com/compose/install) on your system.

## Node

We use the `yarn` package manager to install dependencies and run scripts. Installation instructions can be found in the [dev_environment doc](https://github.com/CommE2E/comm/blob/master/docs/dev_environment.md#node).

## AWS

Some of our services access AWS resources via the AWS C++ SDK. To access these resources, you'll need to configure the `~/.aws/credentials` and `~/.aws/config` files correctly on your host machine. Instructions for setting these configuration files can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).

We recommend running `aws configure`, which will prompt you for the necessary configuration values.

## RabbitMQ (Tunnelbroker only)

[RabbitMQ](https://www.rabbitmq.com/) is an open-source message broker service. We use RabbitMQ in Tunnelbroker to facilitate communication between devices and keyservers. We use the secure AMQPS protocol to connect to RabbitMQ instances hosted on AWS.

In order to access and manage RabbitMQ instances, you'll need credentials and the [proper permissions](https://www.rabbitmq.com/access-control.html). You can add new users or edit permissions for existing ones through the [RabbitMQ Management plugin](https://www.rabbitmq.com/management.html).

Alternatively, you can manage credentials and permissions from the `rabbitmqctl` CLI. For example, to add a new user you can run the following command:

```
rabbitmqctl add_user {username}
```

You'll need to create a Tunnelbroker-specific configuration file.

```
vim services/tunnelbroker/tunnelbroker.ini
```

Provide a unique ID for each running instance of Tunnelbroker and a RabbitMQ URI in accordance with this [specification](https://www.rabbitmq.com/uri-spec.html).

```
[tunnelbroker]
instance-id = tunnelbroker1

[amqp]
uri = amqp://guest:guest@0.0.0.0/vhost
```

# Building and running

`services/package.json` provides useful scripts to build and run services. The `run` scripts will automatically build the services if necessary and run them. The `dev-mode` scripts allow you to use local instances of S3 and DynamoDB instead of the production ones.

You can find the full list of scripts [here](https://github.com/CommE2E/comm/blob/master/services/package.json) in the `scripts` section.

# Developing and debugging

## Visual Studio Code

If you are using Visual Studio Code as your code editor you can [attach to a Docker container](https://code.visualstudio.com/docs/remote/attach-container) and develop inside it.

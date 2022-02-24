---
sidebar_label: Instructions (Linux)
sidebar_position: 3
---

# Linux Instructions

The instructions to set up Comm development environment are only tested and available for Ubuntu 20.04.

:::warning
This doc is very incomplete, so you should start by reading through the [main dev environment instructions](dev_environment_mac/prerequisites). For anything that isn't mentioned here, you should either try to install it with the same approach described in the main docs, or (if that's not possible) you should try to figure out an alternate approach yourself. The following notes can help you for some of the more complex parts.
:::

## React Native

To set up React Native, follow the instructions in the [React Native docs](https://reactnative.dev/docs/environment-setup).

## nvm

You can install nvm following the [nvm installation instructions](https://github.com/nvm-sh/nvm#installing-and-updating).

## Redis

On Ubuntu, you can install the latest stable version of Redis from the `redislabs/redis` package repository via `apt`:

```shell
sudo add-apt-repository ppa:redislabs/redis
sudo apt-get update
sudo apt-get install redis
sudo systemctl start redis
sudo systemctl status redis
```

If you’re not on Ubuntu, you can look for distro-specific binaries using your preferred package manager, or compile from [source](https://redis.io/download).

## Reactotron

Reactotron is an event tracker and logger that can be used to aid in debugging on React Native.

Download and install the Reactotron package from their [release](https://github.com/infinitered/reactotron/blob/master/docs/installing.md) page.

If Reactotron does not connect to the Android Emulator, run the following command and restart the Metro bundler:

```
adb reverse tcp:9090 tcp:9090
```

You can see more information on the [Reactotron installation instructions](https://github.com/infinitered/reactotron/blob/master/docs/quick-start-react-native.md#configure-reactotron-with-your-project).

## phpMyAdmin

On Ubuntu, you can install and run `phpmyadmin` using `apt`:

```
sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl
phpmyadmin
```

## Apache

On Ubuntu, you can install the Apache webserver using `apt`:

```
sudo apt install apache2
```

The you can enable it to run on system startup using `systemd`:

```
sudo systemctl start apache2
sudo systemctl status apache2
```

You'll also need to add a set of Apache modules:

```
sudo a2ensite mod_proxy mod_proxy_http mod_proxy_wstunnel mod_userdir
```

Finally, you'll need to configure the development site. Open `000-default.conf` with your text editor of choice:

```
sudo vim /etc/apache2/sites-enabled/000-default.conf
```

Add the content below, but make sure to replace “ashoat” with your username.

```
<Directory "/Users/ashoat/Sites/">
  AllowOverride All
  Options Indexes FollowSymLinks
  Require all granted
</Directory>

<VirtualHost *:80>
  ProxyRequests on
  ProxyPass /comm/ws ws://localhost:3000/ws
  ProxyPass /comm/ http://localhost:3000/
  ProxyPass /commlanding/ http://localhost:3000/commlanding/

  RequestHeader set "X-Forwarded-Proto" expr=%{REQUEST_SCHEME}
  RequestHeader set "X-Forwarded-SSL" expr=%{HTTPS}
</VirtualHost>
```

Finally, let’s restart Apache so it picks up the changes.

```
sudo systemctl restart apache2
sudo systemctl status apache2
```

## MySQL

First, install Docker with the following commands:

```
sudo apt-get remove docker docker-engine docker.io
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

Next you'll download the MySQL 5.7 Docker image:

```
docker pull mysql:5.7
```

After setting up your MySQL install following the [main dev environment instructions](dev_environment_mac/configuration#mysql), you can use the root password to run your Docker container:

```
docker run --name my-mysql -e MYSQL_ROOT_PASSWORD=password --expose 3306 -p 3306:3306 -v $HOME/mysql-data:/var/lib/mysql -d mysql:5.7
```

You can log in to MySQL database in the Docker container using the following command:

```
docker exec -it my-mysql mysql -p
```

You may find yourself needing to configure your MySQL user using the IP corresponding to the inet entry from `ifconfig docker0` output, rather than the default (`127.0.0.1`):

```
CREATE USER comm@172.17.0.1 IDENTIFIED BY 'password';
GRANT ALL ON comm.* TO comm@172.17.0.1;
```

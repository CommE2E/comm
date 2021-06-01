# Linux Instructions

The instructions to set up Comm development environment are only tested and available for Ubuntu 20.04.

## React Native

To set up the development environment follow the instruction at [reactnative docs](https://reactnative.dev/docs/environment-setup).

## NVM

Follow [nvm installation instructions](https://github.com/nvm-sh/nvm#installing-and-updating).

## Redis

Install the latest stable version of Redis from the redislabs/redis package repository

```
sudo add-apt-repository ppa:redislabs/redis
sudo apt-get update
sudo apt-get install redis
sudo systemctl start redis
sudo systemctl status redis
```

If you're not on Ubuntu, you can look for distro-specific binaries using your preferred package manager, or compile from [source](https://redis.io/download).

## React Native Debugger

Follow installation instructions from [react-native-debugger/issues/116#issuecomment-475866514](https://github.com/jhen0409/react-native-debugger/issues/116#issuecomment-475866514)

## phpMyAdmin

Install and run `phpmyadmin`

```
sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl
phpmyadmin
```

For further configurations refer to [dev_environment.md#phpmyadmin](dev_environment.md#phpmyadmin)

## Apache

Install `apache2` webserver:

```
sudo apt install apache2
```

```
sudo systemctl start apache2
sudo systemctl status apache2
```

Add the following mods:

```
sudo a2ensite mod_proxy mod_proxy_http mod_proxy_wstunnel mod_userdir
```

Open `000-default.conf` with `vim` text editor

```
sudo vim /etc/apache2/sites-enabled/000-default.conf
```

Add the content below, but make sure to replace ashoat with your username

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

## MySql

Install docker with the following commands:

```
sudo apt-get remove docker docker-engine docker.io
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

Download mysql 5.7 docker image:

```
docker pull mysql:5.7
```

Run mysql docker container, the `password` is defined in [`server/secrets/db_config.json`](dev_environment.md#mysql-2).

```
docker run --name my-mysql -e MYSQL_ROOT_PASSWORD=password --expose 3306 -p 3306:3306 -v $HOME/mysql-data:/var/lib/mysql -d mysql:5.7
```

Log in to mysql database in the docker container:

```
docker exec -it my-mysql mysql -p
```

create comm database:

```
CREATE DATABASE comm;
```

Replace the ip `172.17.0.1` with the inet entry from `ifconfig docker0` output:

```
CREATE USER comm@172.17.0.1 IDENTIFIED BY 'password';
GRANT ALL ON comm.* TO comm@172.17.0.1;
```

## Run on Android

You can follow the other steps from the MacOS guide to run the app on Android.

https://github.com/CommE2E/comm/blob/master/docs/dev_environment.md#git-repo

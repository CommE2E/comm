---
sidebar_position: 2
---

# Configuration

## Apache

In both dev and prod environments we have Node configured to run on port 3000, with Apache proxying it across to port 80. The reason for Apache is so that we can use other tech stacks alongside Node.

macOS comes with an Apache installation built in. We just need to configure it a little bit.

First, we’ll edit the main Apache configuration file.

```conf
sudo vim /private/etc/apache2/httpd.conf
```

The following individual lines each need to be uncommented:

```shell
LoadModule proxy_module libexec/apache2/mod_proxy.so
LoadModule proxy_http_module libexec/apache2/mod_proxy_http.so
LoadModule proxy_wstunnel_module libexec/apache2/mod_proxy_wstunnel.so
LoadModule userdir_module libexec/apache2/mod_userdir.so
Include /private/etc/apache2/extra/httpd-userdir.conf
```

Next, we’ll edit the `http-userdir.conf` file.

```shell
sudo vim /private/etc/apache2/extra/httpd-userdir.conf
```

The following line needs to be uncommented:

```shell
Include /private/etc/apache2/users/*.conf
```

Now for the main course. We need to set up a configuration file for the current user.

```shell
sudo vim /private/etc/apache2/users/$USER.conf
```

```shell
<VirtualHost *:80>
  ProxyRequests on
  ProxyPass /comm/ws ws://localhost:3000/ws
  ProxyPass /comm/ http://localhost:3000/
  ProxyPass /commlanding/ http://localhost:3000/commlanding/

  RequestHeader set "X-Forwarded-Proto" expr=%{REQUEST_SCHEME}
  RequestHeader set "X-Forwarded-SSL" expr=%{HTTPS}
</VirtualHost>
```

You’ll want to make sure that Apache can read your new file.

```shell
sudo chmod 644 /private/etc/apache2/users/$USER.conf
```

Finally, let’s restart Apache so it picks up the changes.

```shell
sudo apachectl restart
```

:::caution
If you end up installing a macOS update you should go through the Apache configuration section again, as your Apache config in `httpd.conf` may have been restored to the default.
:::

## MySQL

Next we’ll set up a MySQL user and a fresh database. We’ll start by opening up a MySQL console.

```shell
mysql -u root -p
```

Type in the MySQL root password you set up previously when prompted. Then, we’ll go ahead and create an empty database.

```shell
CREATE DATABASE comm;
```

Now we need to create a user that can access this database. For the following command, replace “password” with a unique password.

```shell
CREATE USER comm@localhost IDENTIFIED BY 'password';
```

Finally, we will give permissions to this user to access this database.

```shell
GRANT ALL ON comm.* TO comm@localhost;
```

You can now exit the MySQL console using Ctrl+D.

## TablePlus

Feel free to use a MySQL administration platform that you’re comfortable with. PHP was deprecated in macOS 12 (Monterey), leading many of us to switch to [TablePlus](https://tableplus.com/).

After installing TablePlus, you need to open a new connection. After opening TablePlus, click the “Create a new connection” text at the bottom of the window that appears.

:::tip
Alternatively, you can navigate through Connection → New... in the menu at the top of the display.
:::

Choose MySQL from the database options that appear. You’ll be prompted for:

- Name (Comm)
- Host (localhost)
- Port (3306 by default)
- User (comm)
- Password (the one you made when initializing the MySQL server in the previous step)

## Android Emulator

In order to test the Android app on your computer you’ll need to set up an Android Emulator. To do this we’ll need to open up the AVD Manager in Android Studio. AVD stands for “Android Virtual Device”. You can access the AVD Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, under “Configure”. If you already have a project open, you can access it from Tools → AVD Manager.

With the AVD Manager open, select “Create Virtual Device” on the bottom row. Feel free to select any “device definition” that includes Play Store support.

On the next screen you’ll be asked to select a system image. Go for the latest version of Android that’s been released.

From there you can just hit Next and then Finish. You should then be able to start your new AVD from the AVD Manager.

## Git repo

### Clone from GitHub

Finally! It’s time to clone the repo from GitHub.

```shell
git clone git@github.com:CommE2E/comm.git
```

Once you have the repo cloned, you can run this command to pull in dependencies.

```shell
cd comm
yarn cleaninstall
```

## URLs

The server needs to know some info about paths in order to properly construct URLs.

```shell
mkdir -p server/facts
vim server/facts/url.json
```

Your `url.json` file should look like this:

```json
{
  "baseRoutePath": "/"
}
```

Next, we’ll create a file for constructing URLs for the main app.

```shell
vim server/facts/app_url.json
```

Your `app_url.json` file should look like this:

```json
{
  "baseDomain": "http://localhost",
  "basePath": "/comm/",
  "https": false
}
```

Finally, we’ll create a file for the URLs in the landing page.

```shell
vim server/facts/landing_url.json
```

Your `landing_url.json` file should look like this:

```json
{
  "baseDomain": "http://localhost",
  "basePath": "/commlanding/",
  "baseRoutePath": "/commlanding/",
  "https": false
}
```

## MySQL

The server side needs to see some config files before things can work. The first is a config file with MySQL details.

```shell
cd server
mkdir secrets
vim secrets/db_config.json
```

The DB config file should look like this:

```json
{
  "host": "localhost",
  "user": "comm",
  "password": "password",
  "database": "comm"
}
```

Make sure to replace the password with the one you set up for your `comm` MySQL user earlier.

New let’s run a script to setup the database. Before we can run the script, we’ll have to use Babel to transpile our source files into something Node can interpret. Babel will transpile the files in `src` into a new directory called `dist`. We also use `rsync` to copy over files that don’t need transpilation.

```shell
yarn babel-build
yarn rsync
yarn script dist/scripts/create-db.js
```

## Olm

The second config file contains some details that the keyserver needs in order to launch Olm sessions to provide E2E encryption.

```shell
cd server
vim secrets/olm_config.json
```

The Olm config file should look like this:

```json
{
  "privateKey": "privateKey"
}
```

## Phabricator

The last configuration step is to set up an account on Phabricator, where we handle code review. Start by [logging in to Phabricator](https://phabricator.ashoat.com) using your GitHub account.

Next, make sure you’re inside the directory containing the Comm Git repository, and run the following command:

```shell
arc install-certificate
```

This command will help you connect your Phabricator account with the local Arcanist instance, allowing you to run `arc diff` and `arc land` commands.

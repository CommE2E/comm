# Requirements

Please note that our dev environment currently only works on macOS and Linux.

For the Linux instructions [head to the Linux configuration steps](linux_dev_environment.md).

<details>
<summary>
Why not Windows? (click to expand)
</summary>
<p>
It’s primarily because Apple only supports iOS development using macOS. It’s true that we could support web, server, and Android development on other operating systems, but because of the Apple requirement, all of our active developers currently run macOS. We’d very much welcome a PR to build out support on Windows!
</p>
</details>

Unfortunately the dev environment is overall pretty heavy. You’ll ideally want a machine with at least 32 GiB of RAM, although 16 GiB should suffice.

# Prerequisites

## Xcode

Go to the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) to install Xcode, or if you already have it, to update it to the latest version.

Once Xcode is installed, open it up. If you are prompted, follow the instructions to install any “Additional Required Components”.

Finally, you need to make sure that the “Command Line Tools” are installed. Go to Xcode → Preferences → Locations, and then install the tools by selecting the most recent version from the Command Line Tools dropdown.

## Homebrew

Install [Homebrew](https://brew.sh/), a package manager for macOS.

## Node

Next, install [Node](https://nodejs.org/) using Homebrew.

```
brew install node; brew upgrade node
```

The reason we use both `install` and `upgrade` is that there’s no single Homebrew command equivalent to “install if not installed, and upgrade if already installed”.

## Yarn

We use the [Yarn](https://yarnpkg.com/) package manager for JavaScript in our repo.

```
brew install yarn; brew upgrade yarn
```

## Watchman

Watchman is a tool from Facebook used in the React Native dev environment to watch for changes to your filesystem.

```
brew install watchman; brew upgrade watchman
```

## nvm

Node Version Manager is a tool that helps us make sure we use the same version of Node on our server between prod and dev environments.

```
brew install nvm; brew upgrade nvm
```

After installing, Homebrew will print out some instructions under the Caveats section of its output. It will ask you to do two things: `mkdir ~/.nvm`, and to add some lines to your `~/.bash_profile` (or desired shell configuration file). We recommend that you append `--no-use` to the line that loads nvm, so that you continue to use your Homebrew-sourced Node distribution by default:

```
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh" --no-use # This loads nvm
[ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && . "/usr/local/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
```

Now either close and reopen your terminal window or re-source your shell configuration file in order to load nvm:

```
source ~/.bash_profile
```

## MySQL

For now we’re using MySQL 5.7 as the primary server-side database. Hopefully we’ll change this soon, but for now, install MySQL 5.7 using Homebrew.

```
brew install mysql@5.7; brew upgrade mysql@5.7
```

Next we’ll configure MySQL to start when your computer boots using `brew services`:

```
brew tap homebrew/services
brew services start mysql@5.7
```

We’ll also want to link MySQL so that you can run CLI commands:

```
brew link mysql@5.7 --force
```

Finally, you should set up a root password for your local MySQL instance:

```
mysqladmin -u root password
```

## Redis

We use Redis on the server side as a message broker.

```
brew install redis; brew upgrade redis
```

We’ll set it up to start on boot with `brew services`:

```
brew services start redis
```

## CocoaPods

CocoaPods is a dependency management system for iOS development. React Native uses it to manage native modules.

```
sudo gem install cocoapods
```

In order for `pod` to be accessible from the command-line, we’ll need to update your `$PATH` environmental variable. Open your `~/.bash_profile` (or desired shell configuration file) and add the following line:

```
export PATH=$PATH:/usr/local/lib/ruby/gems/2.7.0/bin
```

Make sure you reload the `~/.bash_profile` after editing it:

```
source ~/.bash_profile
```

## React Native Debugger

The React Native Debugger allows you to step through JavaScript execution, track Redux state, and inspect the React component tree. Note that because we are midway through transitioning to a custom Hermes JS runtime, React Native Debugger only works with iOS right now. For Android you should use Flipper (for React Dev Tools and JavaScript debugging) or the Redux Dev Tools Chrome extension (for Redux Dev Tools).

```
brew install react-native-debugger; brew upgrade react-native-debugger
```

## Reactotron

Reactotron is an event tracker and logger that can be used to aid in debugging on React Native.

```
brew install reactotron; brew upgrade reactotron
```

## Flipper

Flipper is a debugging tool for mobile applications from Facebook. We use it just with Android right now (see context in the React Native Debugger section above). You can download the latest version for MacOS [here](https://www.facebook.com/fbflipper/public/mac).

## React Dev Tools Chrome extension

The React Dev Tools Chrome extension lets you inspect the React component tree for web applications in Chrome. You can install it by navigating [here](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) on Chrome.

## Redux Dev Tools Chrome extension

The Redux Dev Tools Chrome extension lets you watch for Redux actions and inspect the Redux store state, both for web applications in Chrome, but also for our native applications using the “Remote DevTools” functionality. To install it, navigate [here](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) on Chrome.

## JDK

We’ll need the Java Development Kit for Android development.

```
brew install adoptopenjdk/openjdk/adoptopenjdk8; brew upgrade adoptopenjdk/openjdk/adoptopenjdk8
```

## Android Studio

Start by downloading and installing [Android Studio](https://developer.android.com/studio/index.html). When prompted to choose an installation type, select “Custom”. Make sure you check the boxes for the following:

- `Android SDK`
- `Android SDK Platform`
- `Performance (Intel ® HAXM)`
- `Android Virtual Device`

### Android SDK

Android Studio installs the latest Android SDK by default, but since React Native uses the Android 10 SDK specifically, we’ll need to install it using Android Studio’s SDK Manager. You can access the SDK Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, under “Configure”. If you already have a project open, you can access it from Tools → SDK Manager.

Once you have the SDK Manager open, select the “SDK Platforms” tab, and then check the box for “Show Package Details”. Now expand the “Android 10 (Q)” section, and make sure the following subsections are checked:

- `Android SDK Platform 29`
- `Intel x86 Atom_64 System Image` or `Google APIs Intel x86 Atom System Image`

Next, select the “SDK Tools” tab, and check the box for “Show Package Details”. Expand the “Android SDK Build-Tools” section, and make sure that the “29.0.2” subsection is checked.

To finish the SDK Manager step, click “Apply” to download and install everything you’ve selected.

### Enable Android CLI commands

You’ll need to append the following lines to your `~/.bash_profile` (or desired shell configuration file) in order for React Native to be able to build your Android project.

```
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME="/Applications/Android Studio.app/Contents/jre/jdk/Contents/Home"
```

Now either close and reopen your terminal window or re-source your shell configuration file in order to run the new commands:

```
source ~/.bash_profile
```

## Arcanist

We use Phabricator for code review. To upload a “diff” to Phabricator, you’ll need to use a tool called Arcanist.

To install Arcanist, we’ll need to clone its Git repository. Pick a place in your filesystem to store it, and then run this command:

```
git clone https://github.com/phacility/arcanist.git
```

Next, you’ll need to add the path `./arcanist/bin` to your `$PATH` in your `~/.bash_profile` (or desired shell configuration file):

```
export PATH=$PATH:~/src/arcanist/bin
```

Make sure to replace the `~/src` portion of the above with the location of the directory you installed Arcanist in.

# Configuration

## Apache

In both dev and prod environments we have Node configured to run on port 3000, with Apache proxying it across to port 80. The reason for Apache is so that we can use other tech stacks alongside Node. In particular, we’ve been using a MySQL administration web frontend called PHPMyAdmin.

macOS comes with an Apache installation built in. We just need to configure it a little bit.

First, we’ll edit the main Apache configuration file.

```
sudo vim /private/etc/apache2/httpd.conf
```

The following individual lines each need to be uncommented:

```
LoadModule proxy_module libexec/apache2/mod_proxy.so
LoadModule proxy_http_module libexec/apache2/mod_proxy_http.so
LoadModule proxy_wstunnel_module libexec/apache2/mod_proxy_wstunnel.so
LoadModule userdir_module libexec/apache2/mod_userdir.so
LoadModule php7_module libexec/apache2/libphp7.so
Include /private/etc/apache2/extra/httpd-userdir.conf
```

Next, we’ll edit the `http-userdir.conf` file.

```
sudo vim /private/etc/apache2/extra/httpd-userdir.conf
```

The following line needs to be uncommented:

```
Include /private/etc/apache2/users/*.conf
```

Now for the main course. We need to set up a configuration file for the current user.

```
sudo vim /private/etc/apache2/users/$USER.conf
```

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

Make sure to replace “ashoat” on the first line above with your macOS user.

You’ll also want to make sure that Apache can read your new file.

```
sudo chmod 644 /private/etc/apache2/users/$USER.conf
```

Finally, let’s restart Apache so it picks up the changes.

```
sudo apachectl restart
```

## MySQL

Next we’ll set up a MySQL user and a fresh database. We’ll start by opening up a MySQL console.

```
mysql -u root -p
```

Type in the MySQL root password you set up previously when prompted. Then, we’ll go ahead and create an empty database.

```
CREATE DATABASE comm;
```

Now we need to create a user that can access this database. For the following command, replace “password” with a unique password.

```
CREATE USER comm@localhost IDENTIFIED BY 'password';
```

Finally, we will give permissions to this user to access this database.

```
GRANT ALL ON comm.* TO comm@localhost;
```

You can now exit the MySQL console using Ctrl+D.

## PHPMyAdmin

Next we’ll set up PHPMyAdmin. If you’re familiar with an alternative MySQL administration frontend you can feel free to use it instead.

Start by downloading the latest PHPMyAdmin release from their [website](https://www.phpmyadmin.net/). In the following steps, make sure to replace the version number with the one you downloaded. We’ll begin by unzipping the download.

```
unzip phpMyAdmin-5.0.1-all-languages.zip
```

In our Apache configuration above, we set Apache to handle everything in `~/Sites`, so we’ll go ahead and move PHPMyAdmin over there.

```
mkdir -p ~/Sites
cd ~/Downloads
mv phpMyAdmin-5.0.1-all-languages ~/Sites/phpmyadmin
```

We also need to create a “TempDir” for PHPMyAdmin.

```
pushd ~/Sites/phpmyadmin
mkdir tmp
chmod 777 tmp
popd
```

Next we’ll go through the PHPMyAdmin setup UI. Navigate to http://localhost/~youruser/phpmyadmin/setup/, making sure to replace “youruser” with your macOS username.

If there are any servers listed, go ahead and delete them. Next, select the option to add a new server. Fill out the “verbose name” under “Basic Settings”, and then make sure to set “127.0.0.1” as the hostname. For some reason, “localhost” will not work.

Then tab over to “Authentication”. Select the “config” option under “Authentication type”, and then enter in the MySQL user and password that you created in the previous step. Now hit “Apply”.

You should now be back on the Overview page. Hit “Download” to download the new `config.inc.php` file, and then move it into the `~/Sites/phpmyadmin` folder.

```
mv config.inc.php ~/Sites/phpmyadmin/
```

You should now be able to access PHPMyAdmin without needing to log in. Try navigating to http://localhost/~youruser/phpmyadmin/, making sure to replace “youruser” with your macOS username.

Our final step will be to configure PHP to be able to handle large files, in case you find yourself needing to deal with a database backup. PHP is configured by a `php.ini` file. First, check if you have one in `/private/etc/php.ini`. If you don’t, copy over the default:

```
cp /private/etc/php.ini.default /private/etc/php.ini
```

We just need to update three settings: `memory_limit`, `post_max_size`, and `upload_max_filesize`. All should be set to `256M`.

## Android emulator

In order to test the Android app on your computer you’ll need to set up an Android emulator. To do this we’ll need to open up the AVD Manager in Android Studio. AVD stands for “Android Virtual Device”. You can access the AVD Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, under “Configure”. If you already have a project open, you can access it from Tools → AVD Manager.

With the the AVD Manager open, select “Create Virtual Device” on the bottom row. Feel free to select any “device definition” that includes Play Store support.

On the next screen you’ll be asked to select a system image. Go for the latest version of Android that has been released. That’s currently Android 10, also known as Android Q.

From there you can just hit Next and then Finish. You should then be able to start your new AVD from the AVD Manager.

# Git repo

## Clone from GitHub

Finally! It’s time to clone the repo from GitHub.

```
git clone git@github.com:CommE2E/comm.git
```

Once you have the repo cloned, you can run this command to pull in dependencies.

```
cd comm
yarn cleaninstall
```

## MySQL

The server side needs to see some config files before things can work. The first is a config file with MySQL details.

```
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

```
yarn babel-build
yarn rsync
yarn script dist/scripts/create-db.js
```

## URLs

The server needs to know some info about paths in order to properly construct URLs.

```
mkdir -p server/facts
vim server/facts/url.json
```

Your `url.json` file should look like this:

```json
{
  "baseRoutePath": "/"
}
```

Next, we'll create a file for constructing URLs for the main app.

```
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

Finally, we'll create a file for the URLs in the landing page.

```
vim server/facts/landing_url.json
```

Your `landing_url.json` file should look like this:

```json
{
  "baseDomain": "http://localhost",
  "basePath": "/commlanding/",
  "https": false
}
```

## Phabricator

The last configuration step is to set up an account on Phabricator, where we handle code review. Start by [logging in to Phabricator](https://phabricator.ashoat.com) using your GitHub account.

Next, make sure you’re inside the directory containing the SquadCal Git repository, and run the following command:

```
arc install-certificate
```

This command will help you connect your Phabricator account with the local Arcanist instance, allowing you to run `arc diff` and `arc land` commands.

# Development

## Flow typechecker

It’s good to run the `flow` typechecker frequently to make sure you’re not introducing any type errors. Flow treats each Yarn Workspace as a separate environment, and as such runs a separate type-checking server for each. This server is started when you first run `node_modules/.bin/flow` in each of the four Yarn Workspace folders.

To make sure Flow runs from the command-line, you can edit your `$PATH` environmental variable in your `~/.bash_profile` file (or desired shell configuration file) to always include `./node_modules/.bin`.

```
export PATH=$PATH:./node_modules/.bin
```

As always, make sure you reload the `~/.bash_profile` after editing it:

```
source ~/.bash_profile
```

You should now be able to run `flow` in any of the Yarn workspaces:

```
cd lib
flow
```

## Running web app

Open a new terminal and run:

```
cd web
yarn dev
```

This will start two processes. One is `webpack-dev-server`, which will serve the JS files. `webpack-dev-server` also makes sure the website automatically hot-reloads whenever any of the source files change. The other process is `webpack --watch`, which will build the `app.build.cjs` file, as well as rebuilding it whenever any of the source files change. The `app.build.cjs` file is consumed by the Node server in order to pre-render the initial HTML from the web source (“Server-Side Rendering”).

## Running landing page

Open a new terminal and run:

```
cd landing
yarn dev
```

This runs the same two processes as the web app, but for the landing page. Note that the `landing.build.cjs` file (similar to the web app's `app.build.cjs` file) is consumed by the Node server.

## Running server

Open a new terminal and run:

```
cd server
yarn dev
```

You should now be able to load the web app in your web browser at http://localhost/comm/, and the landing page at http://localhost/commlanding/.

This command runs three processes. The first two are to keep the `dist` folder updated whenever the `src` folder changes. They are “watch” versions of the same Babel and `rsync` commands we used to initially create the `dist` folder (before running the `create-db.js` script above). The final process is `nodemon`, which is similar to `node` except that it restarts whenever any of its source files (in the `dist` directory) changes.

Note that if you run `yarn dev` in `server` right after `yarn cleaninstall`, before Webpack is given a chance to build `app.build.cjs`/`landing.build.cjs` files, then Node will crash when it attempts to import those files. Just make sure to run `yarn dev` (or `yarn prod`) in `web` or `landing` before attempting to load the corresponding webpages.

## Running iOS

First, make sure that the React Native packager is open. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

This command runs two processes. The first is the Metro bundler, which handles bundling our app's JavaScript code and communicating with the debug build of the app running on either the simulator or a physical device. The second is the `remotedev-server` for Redux, which is a proxy of sorts through which the Redux monitor (running in the Chrome extension) can communicate with the debug build of the app.

Next, open `native/ios/SquadCal.xcworkspace` in Xcode. Select a simulator and then hit the play button to build and run the project.

## Running Android

First, make sure that the React Native packager is open. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

This commands runs two processes (see previous section for details).

Next, boot up an Android simulator using Android Studio’s AVD Manager. You should have a single Android simulator (or plugged-in device) running at one time.

Finally, use this command to build and run the Android app:

```
cd native
yarn react-native run-android
```

# Debugging

## React Developer Tools

- For web, you can access the React Developer Tools through the Chrome extension by opening the Chrome Developer Tools and selecting the “Components” or “Profiler” tabs. This should work in both our development environment and in production.
- For iOS, you can access the React Developer Tools through React Native Debugger. Just open up the React Native Debugger application, and then select “Debug” from the React Native dev menu. You can open the React Native dev menu on debug builds of React Native apps by hitting Cmd+Ctrl+Z on the iOS Simulator, or shaking the device if it's a physical device.
- For Android, you can access the React Developer Tools through Flipper. First start a debug build of a React Native app. Next, just open up Flipper and you should be able to see an option for “React DevTools”. Flipper communicates with the app through the Metro bundler that gets started when you run `cd native && yarn dev`.

## Redux Developer Tools

- For web, you can access the Redux Developer Tools through the Chrome extension by opening the Chrome Developer Tools and selecting the “Redux” tab. This should work in both our development environment and in production, although in production you won't be able to see Redux actions from before you opened up the Redux dev tools.
- For iOS, you can access the Redux Developer Tools through React Native Debugger. Just open up the React Native Debugger application, and then select “Debug” from the React Native dev menu. You can open the React Native dev menu on debug builds of React Native apps by hitting Cmd+Ctrl+Z on the iOS Simulator, or shaking the device if it's a physical device.
- For Android, you can access the Redux Developer Tools through the Chrome extension's Remote DevTools functionality. First, to open the Remote DevTools, right click on any webpage, go into the “Redux DevTools” menu, and select “Open Remote DevTools”. Then hit “Settings”, select “Use custom (local) server”, and configure it to connect to `localhost` on port 8043. This will connect to the `remotedev-server` instance that you started when you ran `cd native && yarn dev`.

## Debugging JavaScript

- For web, you can just use your browser of choice's dev tools.
- For iOS, you can use the React Native Debugger. Just open up the React Native Debugger application, and then select “Debug” from the React Native dev menu. You can open the React Native dev menu on debug builds of React Native apps by hitting Cmd+Ctrl+Z on the iOS Simulator, or shaking the device if it's a physical device.
- For Android, you should use Flipper. First start a debug build of a React Native app. Next, just open up Flipper and you should be able to see an option for “Hermes Debugger (RN)”. Flipper communicates with the app through the Metro bundler that gets started when you run `cd native && yarn dev`.

# Working with Phabricator

## Creating a new diff

The biggest difference between GitHub’s PR workflow and Phabricator’s “diff” workflow is that Phabricator lets you create a diff from any commit, or set of commits. In contrast, GitHub can only create PRs from branches.

When you have a commit ready and want to submit a diff for code review, just run `arc diff` from within the SquadCal Git repo. Arcanist will attempt to determine the “base” for your diff automatically, but by default it will take the single most recent commit. You can see what base Arcanist thinks it should use by running `arc which`. You can also explicitly specify a base by using `arc diff --base`. For instance, `arc diff --base HEAD^` will create a diff from the most recent commit, which should be the default behavior.

Keep in mind that `arc diff` always diffs the base against your current working copy. Though this nominally includes any unstashed changes you might have, `arc diff`’s interactive prompts will help you exclude unrelated changes in your working copy.

It’s generally easiest to keep a 1:1 correspondence between diffs and commits. If you’re working with a stack of commits, you can use Git’s interactive rebase feature (`git rebase -i`) to run `arc diff` on each commit individually.

## Updating a diff

Whereas with GitHub PRs, updates are usually created by adding on more commits, in Phabricator the easiest way to update a diff is by amending the existing commit.

When you run `arc diff` on a commit for the first time, it amends the commit message to include a link to the Phabricator diff. If and when you want to update that diff, just run `arc diff` again.

If you’re working with a stack of diffs, and want to update an earlier diff, you can use Git’s interactive rebase feature (`git rebase -i`) to open the stack to a particular point. Then you can amend that commit and run `arc diff` before continuing the rebase.

## Committing a diff

After your diff has been accepted, you should be able to land it. To land a diff just run `arc land` from within the repository.

If you’re dealing with a stack, `arc land` will make sure to only land the diffs that have been accepted, and shouldn’t land any diffs that depend on other diffs that haven’t been accepted yet.

Note that you need commit rights to the repository in order to run `arc land`. If you don’t have commit rights, reach out to @ashoat for assistance.

## Creating a Herald rule

Once you have access to Phabricator, you may want to set up a Herald rule so that you get CC’d on any new diffs. The way to do that in Phabricator is:

1. Go to “More Applications” on the left-hand sidebar.
2. Select “Herald” from the list.
3. Press the “Create Herald Rule” button in the upper-right corner of the screen.
4. Select “Differential Revisions” from the list.
5. Select “Personal Rule” from the list.
6. Set up your new rule to match [this one](https://phabricator.ashoat.com/H2).

## Final notes

When developing, I usually just pop up three terminal windows, one for `yarn dev` in each of server, web, and native.

Note that it’s currently only possible to create a user account using the iOS or Android apps. The website supports logging in, but does not support account creation.

Good luck, and let @ashoat know if you have any questions!

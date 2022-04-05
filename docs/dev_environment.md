# Requirements

Please note that our dev environment currently only works on macOS and Linux.

For the Linux instructions [head to the Linux configuration steps](linux_dev_environment.md).

<details>
<summary>
Why not Windows? (click to expand)
</summary>
<p>
It’s primarily because Apple only supports iOS development using macOS. It’s true that we could support web, keyserver, and Android development on other operating systems, but because of the Apple requirement, all of our active developers currently run macOS. We’d very much welcome a PR to build out support on Windows!
</p>
</details>

Unfortunately the dev environment is overall pretty heavy. You’ll ideally want a machine with at least 32 GiB of RAM, although 16 GiB should suffice.

# Prerequisites

## Xcode

Go to the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) to install Xcode, or if you already have it, to update it to the latest version.

Once Xcode is installed, open it up. If you are prompted, follow the instructions to install any “Additional Required Components”.

Finally, you need to make sure that the Xcode “Command Line Tools” are installed. You can do this by running:

```
xcode-select --install
```

## Homebrew

Install [Homebrew](https://brew.sh/), a package manager for macOS.

## Node

Next, install [Node](https://nodejs.org/) using Homebrew. We’re going to use version 16 to avoid some possible issues that come up on Apple silicon when we install project dependencies.

```
brew install node@16; brew upgrade node@16
```

The reason we use both `install` and `upgrade` is that there’s no single Homebrew command equivalent to “install if not installed, and upgrade if already installed”.

## PHP

[PHP](https://www.php.net) is needed for Arcanist. As of macOS 12 (Monterey), PHP is no longer bundled with the OS and needs to be installed via Homebrew.

```
brew install php@7.4; brew upgrade php@7.4
```

## Rust

We use a Rust [implementation](https://github.com/novifinancial/opaque-ke) of the OPAQUE password-authenticated key exchange protocol, so you will need to install Rust to compile the static library. The easiest way to do this is with `rustup`.

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

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

## Node Version Manager

Node Version Manager (nvm) is a tool that ensures we use the same version of Node on our keyserver between prod and dev environments.

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

We use Redis on the keyserver side as a message broker.

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
brew install cocoapods; brew upgrade cocoapods
```

## Reactotron

Reactotron is an event tracker and logger that can be used to aid in debugging on React Native.

```
brew install reactotron; brew upgrade reactotron
```

## React Dev Tools Chrome extension

The React Dev Tools Chrome extension lets you inspect the React component tree for web applications in Chrome. You can install it by navigating [here](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) on Chrome.

## Redux Dev Tools Chrome extension

The Redux Dev Tools Chrome extension lets you watch for Redux actions and inspect the Redux store state, both for web applications in Chrome, but also for our native applications using the “Remote DevTools” functionality. To install it, navigate [here](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) on Chrome.

## JDK

We’ll need the Java Development Kit (JDK) for Android development. We’re using [SDKMAN!](https://sdkman.io/) to manage our JDK installation.

Run the following to install SDKMAN!:

```
curl -s "https://get.sdkman.io" | bash
```

Now either close and reopen your terminal window or re-source your `~/.bash_profile` (or desired shell configuration file) in order to load SDKMAN!:

```
source ~/.bash_profile
```

You can run `sdk version` to see if SDKMAN! was installed properly.

Run the following to install Azul Zulu 11 with SDKMAN!:

```
sdk install java 11.0.13-zulu
```

SDKMAN! takes care of setting up the `$JAVA_HOME` environment variable to point to the newly installed JDK. You can verify this by running `echo $JAVA_HOME`.

## Android Studio

Start by downloading and installing [Android Studio](https://developer.android.com/studio/index.html) for your platform. When prompted to choose an installation type, select “Custom”.

You’ll be prompted to select a JDK installation. If your SDKMAN!-sourced JDK doesn’t appear in the dropdown, you can find the absolute path to your installed JDK with the following command:

```
sdk home java 11.0.13-zulu
```

Make sure you check the boxes for the following:

#### Intel x86-64:

- `Android SDK`
- `Android SDK Platform`
- `Performance (Intel ® HAXM)`
- `Android Virtual Device`

#### Apple silicon:

- `Android SDK`
- `Android SDK Platform`
- `Android Virtual Device`

### Android SDK

Android Studio installs the latest Android SDK by default, but since React Native uses the Android 11 SDK specifically, we’ll need to install it using Android Studio’s SDK Manager. You can access the SDK Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, under “Configure”. If you already have a project open, you can access it from Tools → SDK Manager.

Once you have the SDK Manager open, select the “SDK Platforms” tab, and then check the box for “Show Package Details”. Now expand the “Android 11 (R)” section, and make sure the following subsections are checked:

- `Android SDK Platform 30`

#### Intel x86-64:

- `Intel x86 Atom_64 System Image` or `Google APIs Intel x86 Atom System Image`

#### Apple silicon:

- `Google Play ARM 64 v8a System Image`

Next, select the “SDK Tools” tab, and check the box for “Show Package Details”. Refer to `native/android/build.gradle` for specific tool versions and install the following:

- Android SDK Build-Tools
- NDK
- CMake version 3.10.2

To finish the SDK Manager step, click “Apply” to download and install everything you’ve selected.

### Enable Android CLI commands

You’ll need to append the following lines to your `~/.bash_profile` (or desired shell configuration file) in order for React Native to be able to build your Android project.

```
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Now either close and reopen your terminal window or re-source your shell configuration file in order to run the new commands:

```
source ~/.bash_profile
```

## Flipper

Flipper is a debugging tool for mobile applications from Facebook. We use it for JavaScript debugging using the Hermes runtime, and also use several plugins such as the React Dev Tools. You can download the latest version of Flipper for MacOS [here](https://www.facebook.com/fbflipper/public/mac).

### Flipper settings

After opening Flipper, click the gear icon in the bottom left and navigate to “Settings”.

Let’s set the Android SDK path. To find the path, open Android Studio and navigate to Preferences → Appearance & Behavior → System Settings → Android SDK. The explicit path of your Android SDK is defined in “Android SDK Location”. Use this path in Flipper Settings as the “Android SDK Location”.

Also, enable the option for “React Native keyboard shortcuts” below.

### Flipper plugins

Flipper has a plugin system that allows teams to integrate additional debugging tools into Flipper. We currently only use one plugin, which is for monitoring Redux state.

To install it, open Flipper and go to View → Manage Plugins. Type in “redux-debugger“ and install the Flipper plugin with that name.

## idb

Flipper relies on Facebook’s idb tool to debug iOS apps running on your device. We’ll need to install it:

```
brew tap facebook/fb
brew install idb-companion
pip3 install --user --upgrade fb-idb
```

Since we run `pip3 install` with `--user` instead of running it with `sudo`, the `idb` executable gets installed in your userdir. For me, running MacOS with Python 3.9, it got installed in `~/Library/Python/3.9/bin/idb`. For Flipper to be able to talk to `idb`, you’ll need to set the IDB Binary Location in the Flipper Settings.

If you have trouble getting Flipper to work with a physical iOS device, it may be due to Python weirdness. The above steps have been tested with Python 3.9 sourced from Homebrew. Let @ashoat know if you have any trouble!

## Codegen for gRPC

gRPC is a framework from Google for writing services. As a developer, you define your service’s API using Protobufs, and gRPC handles the networking and basic infrastructure for you.

The codegen for gRPC takes files written in the [protocol buffers language](https://developers.google.com/protocol-buffers/docs/proto3) as input and outputs C++ code that enables a developer to create a client and a server that use gRPC for communication.

Because of C++ build dependencies, this could not be bundled as an npm package. `brew` also fails to install the required version so if you want to generate files in your local environment, you have to manually install Protobuf.

If you find yourself needing to modify the Protobuf schema files, you’ll need to set up the tools to run the codegen. Follow the steps below:

- `brew install autoconf automake libtool curl make unzip`
- `wget https://github.com/protocolbuffers/protobuf/releases/download/v3.15.8/protobuf-cpp-3.15.8.tar.gz`
- `tar xfzv protobuf-cpp-3.15.8.tar.gz`
- `cd protobuf-3.15.8`
- `./configure`
- `make`
- `make check`
- `make install`

After installing, you should be able to check the version of Protobuf like this: `protoc --version`

After installing Protobuf, you will also need to install gRPC using `brew install grpc`. This will install the `grpc_cpp_plugin` for `protoc` (the Protobuf compiler), which is necessary for compiling gRPC schemas.

Please note that the order is crucial here - you have to first install Protobuf and only then gRPC. This is because otherwise gRPC will install Protobuf automatically from its dependency list, but the version of Protobuf will be incorrect.

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

In both dev and prod environments we have Node configured to run on port 3000, with Apache proxying it across to port 80. The reason for Apache is so that we can use other tech stacks alongside Node.

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

```
sudo chmod 644 /private/etc/apache2/users/$USER.conf
```

Finally, let’s restart Apache so it picks up the changes.

```
sudo apachectl restart
```

If you end up installing a macOS update you should go through the Apache configuration section again, as your Apache config in `httpd.conf` may have been restored to the default.

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

## TablePlus

Feel free to use a MySQL administration platform that you’re comfortable with. PHP was deprecated in macOS 12 (Monterey), leading many of us to switch to [TablePlus](https://tableplus.com/).

After installing TablePlus, you need to open a new connection. After opening TablePlus, click the “Create a new connection” text at the bottom of the window that appears.

- Alternatively, you can navigate through Connection → New... in the menu at the top of the display.

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

## URLs

The keyserver needs to know some info about paths in order to properly construct URLs.

```
mkdir -p keyserver/facts
vim keyserver/facts/url.json
```

Your `url.json` file should look like this:

```json
{
  "baseRoutePath": "/"
}
```

Next, we’ll create files for constructing URLs for the main app.

```
vim keyserver/facts/squadcal_url.json
```

Your `squadcal_url.json` file should look like this:

```json
{
  "baseDomain": "http://localhost",
  "basePath": "/comm/",
  "baseRoutePath": "/",
  "https": false
}
```

Copy the contents of `squadcal_url.json` to a file called `commapp_url.json`.

```
cp server/facts/squadcal_url.json server/facts/commapp_url.json
```

Finally, we’ll create a file for the URLs in the landing page.

```
vim keyserver/facts/landing_url.json
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

The keyserver side needs to see some config files before things can work. The first is a config file with MySQL details.

```
cd keyserver
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

## Olm

The second config file contains some details that the keyserver needs in order to launch Olm sessions to provide E2E encryption.

```
cd keyserver
yarn script dist/scripts/generate-olm-config.json
```

This script will create the `keyserver/secrets/olm_config.json` config file.

## Phabricator

The last configuration step is to set up an account on Phabricator, where we handle code review. Start by [logging in to Phabricator](https://phabricator.ashoat.com) using your GitHub account.

Next, make sure you’re inside the directory containing the Comm Git repository, and run the following command:

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

This runs the same two processes as the web app, but for the landing page. Note that the `landing.build.cjs` file (similar to the web app’s `app.build.cjs` file) is consumed by the Node server.

## Running keyserver

Open a new terminal and run:

```
cd keyserver
yarn dev
```

You should now be able to load the web app in your web browser at http://localhost/comm/, and the landing page at http://localhost/commlanding/.

This command runs three processes. The first two are to keep the `dist` folder updated whenever the `src` folder changes. They are “watch” versions of the same Babel and `rsync` commands we used to initially create the `dist` folder (before running the `create-db.js` script above). The final process is `nodemon`, which is similar to `node` except that it restarts whenever any of its source files (in the `dist` directory) changes.

Note that if you run `yarn dev` in `keyserver` right after `yarn cleaninstall`, before Webpack is given a chance to build `app.build.cjs`/`landing.build.cjs` files, then Node will crash when it attempts to import those files. Just make sure to run `yarn dev` (or `yarn prod`) in `web` or `landing` before attempting to load the corresponding webpages.

## Running mobile app on iOS Simulator

First, make sure that the Metro bundler is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

This command runs two processes. The first is the Metro bundler, which handles bundling our app’s JavaScript code and communicating with the debug build of the app running on either a physical or virtual device. The second is the `remotedev-server` for Redux, which is a proxy of sorts through which the Redux monitor (running in the Chrome extension) can communicate with the debug build of the app.

Next, open `native/ios/Comm.xcworkspace` in Xcode. Select a Simulator from the Scheme menu in the Workspace Toolbar. Then hit the Run button to build and run the project.

## Running mobile app on Android Emulator

First, make sure that the Metro bundler is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

This command runs two processes (see previous section for details).

Next, boot up an Android Emulator using Android Studio’s AVD Manager. You should have a single Android Emulator (or plugged-in device) running at one time.

Finally, use this command to build and run the Android app:

```
cd native
yarn react-native run-android
```

## Running mobile app on physical iOS devices

There are a few things you’ll need to do before you can deploy the app to a physical iOS device.

### Xcode settings

First, in Xcode, open the Comm workspace `native/ios/Comm.xcworkspace`. Make sure that you’re signed into Xcode with an Apple Developer account (either the Comm developer team’s or your own). You can see any accounts currently associated with Xcode by navigating to Xcode → Preferences → Accounts.

Next, you’ll want to ensure that the Comm project is configured with a valid Team, Bundle Identifier, and Provisioning Profile. To access these settings, navigate to View → Navigators → Project, and select the “Comm” project in the left sidebar. Then, select “Comm” from the “TARGETS” list, and navigate to the “Signing & Capabilities” tab. You should verify the following settings:

#### Using a Comm development team Apple Developer account

- Team
  - Comm Technologies, Inc.
- Bundle Identifier
  - app.comm
- Provisioning Profile
  - Make sure that the Provisioning Profile exists

#### Using a Personal Apple Developer account

- Team
  - Set this to a valid “Team”, which can just be your personal Apple Developer account. “Comm Technologies, Inc.” may be chosen by default, but it’s not valid if you’re using a personal Apple Developer account
- Bundle Identifier
  - Pick a unique [Bundle Identifier](https://developer.apple.com/documentation/xcode/preparing-your-app-for-distribution)
- Provisioning Profile
  - Make sure that the Provisioning Profile exists

### Building and deploying the app

When you plug your iOS device into your machine for the first time, you’ll be prompted to enter your device passcode to enable debugging and deployment. Click the ”Register” button in the dialog that Xcode displays if your device needs to be added to your Provisioning Profile.

Make sure to pull the latest changes and clean the build folder before trying to deploy a build to your device. In Xcode, run Product → Clean Build Folder.

If you’re running a debug build, you’ll need to check that the Metro bundler is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

This command runs the Metro bundler and `remotedev-server` for Redux (see the “Running mobile app on iOS simulator” section for more details).

You should finally be ready to build and deploy the app in Xcode! Select your physical device from ”run destinations” in the Workspace Toolbar. Then hit the Run button to build and run the project.

If you’re connecting to a local keyserver instance, you’ll want to “Allow Comm to Access” the “Local Network” in your device Settings. This toggle can be found from Settings → Comm. Note that this setting is not enabled by default, and you may have to re-enable it on subsequent build deployments.

### Connecting to local keyserver

If you want your custom build of the app to connect to your local instance of the Node.js server (the `keyserver` subdirectory of the repo), you’ll need to do some additional work. First, confirm that your computer and physical iOS device are on the same network. If you’re running a local keyserver instance, you’ll need to be able to reach it with your device. Local keyservers run on the local IP address at port 8043.

To find your machine’s local IP address, navigate to System Preferences → Network, and select the hardware interface you’re currently using to connect to the internet (Wi-Fi, or potentially a Thunderbolt port for ethernet connections). Next, click “Advanced” and go to the “TCP/IP” tab. Your local IP address is listed as the “IPv4 Address”. Try visiting this IP address using a browser on your device. It should display an “It works!” message if your iOS device can reach your machine.

Finally, we need to direct the mobile app to use your local keyserver instance. There are a few different ways to do this, depending on your situation:

- As long as you’re deploying a debug build, this strategy should work for you. You can create a `network.json` file in `native/facts` that will override the default.

  ```
  mkdir -p native/facts
  vim native/facts/network.json
  ```

  Your `network.json` file should look like the following, where `w.x.y.z` is the local IP address you found earlier:

  ```json
  {
    "natDevHostname": "w.x.y.z"
  }
  ```

  You’ll need to delete and reinstall the app for changes to `native/facts/network.json` to take effect, as the default production URL is persisted in Redux.

- If you’re deploying a release build, the above strategy won’t work. Your best bet to override the server URL is to get to the secret “Developer tools” menu option in the app.

  1.  You may need to use a real production account for this, since the server address will default to the production server if this is the first build you've deployed to the target device.
  2.  Next, in order for the “Developer tools” menu option to appear, you’ll need to add your user ID to [the list of user IDs in `staff.json`](https://github.com/CommE2E/comm/blob/master/lib/facts/staff.json). A good way to figure out your user ID is to use the Chrome Redux debugger to inspect the `currentUserInfo` property when logged into the web app.
  3.  Finally, you should be able to navigate to Profile → Developer tools in the app and set the address of the local server. It should look something like this:

      ```
      http://w.x.y.z/comm
      ```

      Where `w.x.y.z` is the local IP address you found earlier.

- Alternately, if you’re on a release build and option 2 above seems like too much of a hassle, you should be able to simply change the value of [`productionNodeServerURL` in the code](https://github.com/CommE2E/comm/blob/9e6a13f1569787b498a72c890b12ce0dd8323804/native/utils/url-utils.js#L12). Note that you’ll need to delete and reinstall the app for this change to take effect, as the default production URL is persisted in Redux.

## Running Node scripts

To run one of the scripts in `keyserver/src/scripts`, you should start by making sure that the Node server is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

Then, from the `keyserver` directory, run `yarn script dist/scripts/name.js`, where `name.js` is the file containing the script.

## Codegen

We use a couple of tools that automatically generate code. There is always a source of truth – usually some file(s) with schemas.

### Codegen for JSI

JSI is a framework in React Native that allows C++ and JS to communicate synchronously and directly. The codegen for JSI takes a Flow schema and generates C++ files that enable communication between JS and C++ in `react-native` apps.

The script to generate this code is written in JavaScript and is included as a npm package so no additional software is needed to use it. The schema has to be defined in Flow as an interface, and that interface must inherit from react-native’s `TurboModule` interface.

To run the JSI codegen, just run:

```
cd native
yarn codegen-jsi
```

The input Flow schemas are located in `native/schema`.

### Codegen for gRPC

In order to generate the codegen files for gRPC, you should run the following command:

```
cd native
yarn codegen-grpc
```

# Debugging

## React Developer Tools

- For web, you can access the React Developer Tools through the Chrome extension by opening the Chrome Developer Tools and selecting the “Components” or “Profiler” tabs. This should work in both our development environment and in production.
- For iOS and Android, you can access the React Developer Tools through Flipper. First start a debug build of a React Native app. Next, just open up Flipper and you should be able to see an option for “React DevTools”. Flipper communicates with the app through the Metro bundler that gets started when you run `cd native && yarn dev`.

## Redux Developer Tools

- For web, you can access the Redux Developer Tools through the Chrome extension by opening the Chrome Developer Tools and selecting the “Redux” tab. This should work in both our development environment and in production, although in production you won’t be able to see Redux actions from before you opened up the Redux dev tools.
- For iOS and Android, you can access the Redux Developer Tools through the Chrome extension’s Remote DevTools functionality. First, to open the Remote DevTools, right click on any webpage, go into the “Redux DevTools” menu, and select “Open Remote DevTools”. Then hit “Settings”, select “Use custom (local) server”, and configure it to connect to `localhost` on port 8043. This will connect to the `remotedev-server` instance that you started when you ran `cd native && yarn dev`.

## Debugging JavaScript

- For web, you can just use your browser of choice’s dev tools.
- For iOS and Android, you should use Flipper. First start a debug build of a React Native app. Next, just open up Flipper and you should be able to see an option for “Hermes Debugger (RN)”. Flipper communicates with the app through the Metro bundler that gets started when you run `cd native && yarn dev`.

# Working with Phabricator

## Creating a new diff

The biggest difference between GitHub’s PR workflow and Phabricator’s “diff” workflow is that Phabricator lets you create a diff from any commit, or set of commits. In contrast, GitHub can only create PRs from branches.

When you have a commit ready and want to submit a diff for code review, just run `arc diff` from within the Comm Git repo. Arcanist will attempt to determine the “base” for your diff automatically, but by default it will take the single most recent commit. You can see what base Arcanist thinks it should use by running `arc which`. You can also explicitly specify a base by using `arc diff --base`. For instance, `arc diff --base HEAD^` will create a diff from the most recent commit, which should be the default behavior.

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

When developing, I usually just pop up three terminal windows, one for `yarn dev` in each of keyserver, web, and native.

Note that it’s currently only possible to create a user account using the iOS or Android apps. The website supports logging in, but does not support account creation.

Good luck, and let @ashoat know if you have any questions!

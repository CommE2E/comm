# Requirements

:warning: **This document is outdated. Click [here](./nix_dev_env.md) for the latest dev environment setup instructions.**

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

Finally, you need to make sure that the Xcode “Command Line Tools” are installed. Run this command:

```
xcode-select --install
```

## Homebrew

Install [Homebrew](https://brew.sh/), a package manager for macOS.

## Node

Next, install [Node](https://nodejs.org/) using Homebrew. We’re going to use version 16 to avoid some possible issues that come up on Apple silicon when we install project dependencies.

```
brew install node@16 && brew upgrade node@16
```

The reason we use both `install` and `upgrade` is that there’s no single Homebrew command equivalent to “install if not installed, and upgrade if already installed”.

## PHP

[PHP](https://www.php.net) is needed for Arcanist. As of macOS 12 (Monterey), PHP is no longer bundled with the OS and needs to be installed via Homebrew.

```
brew install php@7.4 && brew upgrade php@7.4
```

## Rust

We use a Rust [implementation](https://github.com/novifinancial/opaque-ke) of the OPAQUE password-authenticated key exchange protocol, so you will need to install Rust to compile the static library. The easiest way to do this is with `rustup`.

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## ShellCheck

[ShellCheck](https://www.shellcheck.net/) is a static analysis tool that provides warnings and suggestions for shell scripts. We’ll install ShellCheck using Homebrew.

```
brew install shellcheck && brew upgrade shellcheck
```

## Yarn

We use the [Yarn](https://yarnpkg.com/) package manager for JavaScript in our repo.

```
brew install yarn && brew upgrade yarn
```

## Watchman

Watchman is a tool from Facebook used in the React Native dev environment to watch for changes to your filesystem.

```
brew install watchman && brew upgrade watchman
```

## Node Version Manager

Node Version Manager (nvm) is a tool that ensures we use the same version of Node on our keyserver between prod and dev environments.

```
brew install nvm && brew upgrade nvm
```

After installing, Homebrew will print out some instructions under the Caveats section of its output. It will ask you to do two things: `mkdir ~/.nvm`, and to add some lines to your `~/.bash_profile` (or desired shell configuration file). We recommend that you append `--no-use` to the line that loads nvm, so that you continue to use your Homebrew-sourced Node distribution by default.

These lines are different depending on if you’re on Apple silicon or Intel x86-64. If you’re on Apple silicon, you should add the following to your shell configuration file (note the addition of the `--no-use` flag on the line that loads nvm):

```
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh" --no-use # This loads nvm
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
```

Otherwise, if you’re on Intel x86-64, add the following to your shell configuration file:

```
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && \. "/usr/local/opt/nvm/nvm.sh" --no-use # This loads nvm
[ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/usr/local/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
```

Now either close and reopen your terminal window or re-source your shell configuration file in order to load nvm:

```
source ~/.bash_profile
```

## MariaDB

For the keyserver database we use MariaDB, which is a community-driven fork of MySQL. In this step we’ll install MariaDB using Homebrew.

```
brew install mariadb && brew upgrade mariadb
```

Next we’ll configure MariaDB to start when your computer boots using `brew services`:

```
brew tap homebrew/services
brew services start mariadb
```

Finally, you should set up a root password for your local MariaDB instance. To do this we’ll use the `mysqladmin` command. Note that many of MariaDB’s commands still use the “mysql” name for compatibility.

```
sudo mysqladmin -u root password
```

## Redis

We use Redis on the keyserver side as a message broker.

```
brew install redis && brew upgrade redis
```

We’ll set it up to start on boot with `brew services`:

```
brew services start redis
```

## CocoaPods

CocoaPods is a dependency management system for iOS development. React Native uses it to manage native modules.

```
brew install cocoapods && brew upgrade cocoapods
```

## Reactotron

Reactotron is an event tracker and logger that can be used to aid in debugging on React Native.

```
brew install reactotron && brew upgrade reactotron
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

Android Studio installs the latest Android SDK by default, but since React Native uses the Android 11 SDK specifically, we’ll need to install it using Android Studio’s SDK Manager. You can access the SDK Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, from More Actions → SDK Manager. If you already have a project open, you can access it from Tools → SDK Manager.

Once you have the SDK Manager open, select the “SDK Platforms” tab, and then check the box for “Show Package Details”. Now expand the “Android 11 (R)” section, and make sure the following subsections are checked:

- `Android SDK Platform 30`

#### Intel x86-64:

- `Intel x86 Atom_64 System Image` or `Google APIs Intel x86 Atom System Image`

#### Apple silicon:

- `Google Play ARM 64 v8a System Image`

Next, select the “SDK Tools” tab, and check the box for “Show Package Details”. Refer to `native/android/build.gradle` for specific tool versions and install the following:

- Android SDK Build-Tools
- NDK
- CMake version 3.18.1

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

## MariaDB

Next we’ll set up a MariaDB user and a fresh database. We’ll start by opening up a console using the `mysql` command.

```
mysql -u root -p
```

Type in the MariaDB root password you set up previously when prompted. Then, we’ll go ahead and create an empty database.

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

You can now exit the MariaDB console using Ctrl+D.

## TablePlus

Feel free to use any MariaDB administration platform that you’re comfortable with. PHP was deprecated in macOS 12 (Monterey), leading many of us to switch to [TablePlus](https://tableplus.com/).

After installing TablePlus, you need to open a new connection. After opening TablePlus, click the “Create a new connection” text at the bottom of the window that appears.

- Alternatively, you can navigate through Connection → New... in the menu at the top of the display.

Choose MariaDB from the database options that appear. You’ll be prompted for:

- Name (Comm)
- Host (localhost)
- Port (3306 by default)
- User (comm)
- Password (the one you made when initializing the MariaDB server in the previous step)

## Android Emulator

In order to test the Android app on your computer you’ll need to set up an Android Emulator. To do this we’ll need to open up the Virtual Device Manager in Android Studio. You can access the Virtual Device Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, from More Actions → Virtual Device Manager. If you already have a project open, you can access it from Tools → Virtual Device Manager.

With the Virtual Device Manager open, select “Create device” on the top left. Feel free to select any “device definition” that includes Play Store support.

On the next screen you’ll be asked to select a system image. Go for the latest version of Android that’s been released.

From there you can just hit Next and then Finish. You should then be able to start your new Android Virtual Device from the Virtual Device Manager.

# Git repo

## Clone from GitHub

Finally! It’s time to clone the repo from GitHub.

```
git clone git@github.com:CommE2E/comm.git
```

Once you have the repo cloned, run this command to pull in dependencies.

```
cd comm
yarn cleaninstall
```

## URLs

The keyserver needs to know some info about paths in order to properly construct URLs.

```
mkdir -p keyserver/facts
vim keyserver/facts/commapp_url.json
```

Your `commapp_url.json` file should look like this:

```json
{
  "baseDomain": "http://localhost:3000",
  "basePath": "/comm/",
  "baseRoutePath": "/comm/",
  "https": false,
  "proxy": "none"
}
```

Additionally, we’ll create a file for the URLs in the landing page.

```
vim keyserver/facts/landing_url.json
```

Your `landing_url.json` file should look like this:

```json
{
  "baseDomain": "http://localhost:3000",
  "basePath": "/commlanding/",
  "baseRoutePath": "/commlanding/",
  "https": false,
  "proxy": "none"
}
```

## MariaDB

The keyserver side needs to see some config files before things can work. The first is a config file with MariaDB details.

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
  "database": "comm",
  "dbType": "mariadb10.8"
}
```

Make sure to replace the password with the one you set up for your `comm` MariaDB user earlier.

## Olm

The second config file contains some details that the keyserver needs in order to launch Olm sessions to provide E2E encryption.

We have a script that can generate this file for you. However, before we can run the script we’ll need to use Babel to transpile our source files into something Node can interpret. Babel will transpile the files in `src` into a new directory called `dist`. We’ll also use `rsync` to copy over files that don’t need transpilation.

```
cd keyserver
yarn babel-build
yarn rsync
yarn script dist/scripts/generate-olm-config.js
```

This script will create the `keyserver/secrets/olm_config.json` config file.

## Phabricator

The last configuration step is to set up an account on Phabricator, where we handle code review. Start by [logging in to Phabricator](https://phab.comm.dev) using your GitHub account.

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

## Running keyserver

To run the web app, landing page, or the mobile app on the iOS Simulator or Android Emulator, you’ll need to run the keyserver.

Open a new terminal and run:

```
cd keyserver
yarn dev
```

This command runs three processes. The first two are to keep the `dist` folder updated whenever the `src` folder changes. They are “watch” versions of the same Babel and `rsync` commands we used to initially create the `dist` folder (before running the `generate-olm-config.js` script above). The final process is `nodemon`, which is similar to `node` except that it restarts whenever any of its source files (in the `dist` directory) changes.

Note that if you run `yarn dev` in `keyserver` right after `yarn cleaninstall`, before Webpack is given a chance to build `app.build.cjs`/`landing.build.cjs` files, then Node will crash when it attempts to import those files. Just make sure to run `yarn dev` (or `yarn prod`) in `web` or `landing` before attempting to load the corresponding webpages.

## Running web app

First, make sure that the keyserver is running. If you haven’t already, run:

```
cd keyserver
yarn dev
```

Next, open a new terminal and run:

```
cd web
yarn dev
```

You should now be able to load the web app in your web browser at http://localhost/comm/.

This command will start two processes. One is `webpack-dev-server`, which will serve the JS files. `webpack-dev-server` also makes sure the website automatically hot-reloads whenever any of the source files change. The other process is `webpack --watch`, which will build the `app.build.cjs` file, as well as rebuilding it whenever any of the source files change. The `app.build.cjs` file is consumed by the Node server in order to pre-render the initial HTML from the web source (“Server-Side Rendering”).

## Running desktop app

First, make sure that the keyserver and the web app is running. If you haven’t already, run:

```
cd keyserver
yarn dev
```

Next, open a new terminal and run:

```
cd web
yarn dev
```

Then start the desktop app:

```
cd desktop
yarn dev
```

This will run the desktop app in dev mode. Only code that is shared with the web app will be hot-reloaded, but you can easily reload the Electron app by typing `rs` into the terminal.

## Running landing page

First, make sure that the keyserver is running. If you haven’t already, run:

```
cd keyserver
yarn dev
```

Next, open a new terminal and run:

```
cd landing
yarn dev
```

You should now be able to load the landing page in your web browser at http://localhost/commlanding/.

This runs the same two processes as the web app, but for the landing page. Note that the `landing.build.cjs` file (similar to the web app’s `app.build.cjs` file) is consumed by the Node server.

## Running mobile app on iOS Simulator

First, make sure that the keyserver is running. If you haven’t already, run:

```
cd keyserver
yarn dev
```

Next, make sure that the Metro bundler is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

This command runs the Metro bundler, which handles bundling our app’s JavaScript code and communicating with the debug build of the app running on either a physical or virtual device.

Finally, open `native/ios/Comm.xcworkspace` in Xcode. Select a Simulator from the Scheme menu in the Workspace Toolbar. Then hit the Run button to build and run the project.

## Running mobile app on Android Emulator

First, make sure that the keyserver is running. If you haven’t already, run:

```
cd keyserver
yarn dev
```

Next, make sure that the Metro bundler is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

Next, boot up an Android Emulator using Android Studio’s Virtual Device Manager. You should have a single Android Emulator (or plugged-in device) running at one time.

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

When you plug your iOS device into your machine for the first time, you’ll be prompted to enter your device passcode to enable debugging and deployment. Click the “Register” button in the dialog that Xcode displays if your device needs to be added to your Provisioning Profile.

Make sure to pull the latest changes and clean the build folder before trying to deploy a build to your device. In Xcode, run Product → Clean Build Folder.

If you’re running a debug build, you’ll need to check that the Metro bundler is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

You should finally be ready to build and deploy the app in Xcode! Select your physical device from ”run destinations” in the Workspace Toolbar. Then hit the Run button to build and run the project.

On the launcher screen choose your development server. If this is the first build you’re deploying to the target device, choose the “Enter URL manually” option, and type `http://w.x.y.z:8081`, where `w.x.y.z` is your machine’s local IP address.

Your machine’s local IP address is displayed below the QR code, in the terminal window running the Metro bundler. Try visiting this IP address at port 80, using a browser on your device. It should display an “It works!” message if your iOS device can reach your machine.

If you’re connecting to a local keyserver instance, you’ll want to “Allow Comm to Access” the “Local Network” in your device Settings. This toggle can be found from Settings → Comm. Note that this setting is not enabled by default, and you may have to re-enable it on subsequent build deployments.

### Connecting to local keyserver

If you want your custom build of the app to connect to your local instance of the Node.js server (the `keyserver` subdirectory of the repo), you’ll need to do some additional work. First, confirm that your computer and physical iOS device are on the same network. If you’re running a local keyserver instance, you’ll need to be able to reach it with your device. Local keyservers run on the local IP address at port 3000.

Finally, we need to direct the mobile app to use your local keyserver instance. There are a few different ways to do this, depending on your situation:

- As long as you’re deploying a debug build, your local machine’s IP address should automatically be propagated to the native app when running the Metro bundler. This is the same IP that was discussed in the previous section.

  If for whatever reason this value is incorrect, you can override it by setting the `COMM_NAT_DEV_HOSTNAME` environment variable and restarting the Metro bundler:

  ```sh
  cd native
  COMM_NAT_DEV_HOSTNAME=w.x.y.z yarn dev
  ```

  Where `w.x.y.z` is the hostname you want to use.

  You’ll need to delete and reinstall the app for changes to developer’s machine hostname to take effect, as the default keyserver URL is persisted in Redux.

- If you’re deploying a release build, the above strategy won’t work. Your best bet to override the server URL is to get to the secret “Developer tools” menu option in the app.

  1.  You may need to use a real production account for this, since the server address will default to the production server if this is the first build you’ve deployed to the target device.
  2.  Next, in order for the “Developer tools” menu option to appear, you’ll need to add your user ID to [the list of user IDs in `staff.js`](https://github.com/CommE2E/comm/blob/master/lib/facts/staff.js). A good way to figure out your user ID is to use the Chrome Redux debugger to inspect the `currentUserInfo` property when logged into the web app.
  3.  Finally, you should be able to navigate to Profile → Developer tools in the app and set the address of the local server. It should look something like this:

      ```
      http://w.x.y.z/comm
      ```

      Where `w.x.y.z` is the local IP address you found earlier.

- Alternately, if you’re on a release build and option 2 above seems like too much of a hassle, you should be able to simply change the value of [`productionNodeServerURL` in the code](https://github.com/CommE2E/comm/blob/9e6a13f1569787b498a72c890b12ce0dd8323804/native/utils/url-utils.js#L12). Note that you’ll need to delete and reinstall the app for this change to take effect, as the default production URL is persisted in Redux.

## Running Node scripts

To run one of the scripts in `keyserver/src/scripts`, you should start by making sure that the Node server is running. If you haven’t already, open a new terminal and run:

```
cd keyserver
yarn dev
```

Then, from the `keyserver` directory, run `yarn script dist/scripts/name.js`, where `name.js` is the file containing the script.

## Creating a new user

To create a new user, [run the keyserver](#running-keyserver) and the [mobile app on iOS Simulator](#running-mobile-app-on-ios-simulator), and then select “Sign Up” in the app. When you sign up, a new user will be created on your local MariaDB instance. You can then log in on any device connected to your local keyserver.

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

# Debugging

## React Developer Tools

- For web, you can access the React Developer Tools through the Chrome extension by opening the Chrome Developer Tools and selecting the “Components” or “Profiler” tabs. This should work in both our development environment and in production.
- For iOS and Android, you can access the React Developer Tools by running `cd native && yarn react-devtools`. If you want to use it along with the JS debugger (see [Debugging JavaScript](#debugging-javascript)), you should open the JS debugger first, then open React Developer Tools, and finally refresh the app via the dev menu. More details on using React Developer Tools with React Native can be found [here](https://github.com/facebook/react/tree/main/packages/react-devtools#usage-with-react-native).

## Redux Developer Tools

- For web, you can access the Redux Developer Tools through the Chrome extension by opening the Chrome Developer Tools and selecting the “Redux” tab. This should work in both our development environment and in production, although in production you won’t be able to see Redux actions from before you opened up the Redux dev tools.
- For iOS and Android, you can access the Redux Developer Tools by running `cd native && yarn redux-devtools`. On the first open, you’ll need to go to “Settings”, select “Use custom (local) server”, configure it to use port 8043, and then finally hit “Connect”. If you want to use it along with the JS debugger (see [Debugging JavaScript](#debugging-javascript)), you should open the JS debugger first, then open Redux Developer Tools, and finally refresh the app via the dev menu.

## Debugging JavaScript

- For web, you can just use your browser of choice’s dev tools.
- For iOS and Android, you can use the dev menu in dev builds to open up a JS debugger, where you can set breakpoints via the `debugger` expression.

# Working with Phabricator

## Creating a new diff

The biggest difference between GitHub PRs and Phabricator diffs is that a PR corresponds to a branch, whereas a diff corresponds to a commit.

When you have a commit ready and want to submit it for code review, just run `arc diff` from within the Comm Git repo. `arc diff` will look at the most recent commit in `git log` and create a new diff for it.

## Updating a diff

With GitHub PRs, updates are usually performed by adding on more commits. In contrast, in Phabricator a diff is updated by simply amending the existing commit and running `arc diff` again.

When you run `arc diff`, it looks for a `Differential Revision: ` line in the commit text of the most recent commit. If Arcanist finds that line, it will assume you want to update the existing diff rather than create a new one. Other Arcanist commands such as `arc amend` (which amends commit text to match a diff on Phabricator) also look for the `Differential Revision: ` line.

## Working with a stack

One of the advantages of Phabricator’s approach is that larger, multi-part changes can be split up into smaller pieces for review. These multi-part changes are usually referred to as a “stack” of diffs.

When creating a diff that depends on another, you should make sure to create a dependency relationship between those two diffs, so that your reviewers can see the stack on Phabricator. The easiest way to do that is to include `Depends on D123` in the commit text of the child commit, but the dependency relationship can also be specified using the Phabricator web UI.

You’ll find that mastering Git’s interactive rebase feature (`git rebase -i`) will help you a lot when working with stacks. Interactive rebases make it easy to “diff up” multiple commits at once, or to amend a specific commit in the middle of a stack in response to a review.

## Committing a diff

After your diff has been accepted, you should be able to land it. To land a diff just run `arc land` from within the repository.

If you have a stack of unlanded commits in your Git branch, `arc land` will attempt to land all of those diffs. If some of the diffs in your stack haven’t been accepted yet, you’ll need to create a new, separate branch that contains just the commits you want to land before running `arc land`.

Note that you need commit rights to the repository in order to run `arc land`. If you don’t have commit rights, reach out to @ashoat for assistance.

## Final notes

When developing, I usually just pop up three terminal windows, one for `yarn dev` in each of keyserver, web, and native.

Note that it’s currently only possible to create a user account using the iOS or Android apps. The website supports logging in, but does not support account creation.

Good luck, and let @ashoat know if you have any questions!

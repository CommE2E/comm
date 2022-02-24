---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Prerequisites

<Tabs groupId="chipset">
  <TabItem value="silicon" label="Apple silicon"></TabItem>
  <TabItem value="x86-64" label="Intel x86-64"></TabItem>
</Tabs>

## Xcode

Go to the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) to install Xcode, or if you already have it, to update it to the latest version.

Once Xcode is installed, open it up. If you are prompted, follow the instructions to install any “Additional Required Components”.

:::note

Make sure that the Xcode “Command Line Tools” are installed. You can do this by running:

```shell
xcode-select --install
```

:::

## Homebrew

Install [Homebrew](https://brew.sh/), a package manager for macOS.

## Node

Next, install [Node](https://nodejs.org/) using Homebrew. We’re going to use version 16 to avoid some possible issues that come up on Apple silicon when we install project dependencies.

```shell
brew install node@16; brew upgrade node@16
```

The reason we use both `install` and `upgrade` is that there’s no single Homebrew command equivalent to “install if not installed, and upgrade if already installed”.

## PHP

[PHP](https://www.php.net) is needed for Arcanist. As of macOS 12 (Monterey), PHP is no longer bundled with the OS and needs to be installed via Homebrew.

```shell
brew install php@7.4; brew upgrade php@7.4
```

## Rust

We use a Rust [implementation](https://github.com/novifinancial/opaque-ke) of the OPAQUE password-authenticated key exchange protocol, so you will need to install Rust to compile the static library. The easiest way to do this is with `rustup`.

```shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Yarn

We use the [Yarn](https://yarnpkg.com/) package manager for JavaScript in our repo.

```shell
brew install yarn; brew upgrade yarn
```

## Watchman

Watchman is a tool from Facebook used in the React Native dev environment to watch for changes to your filesystem.

```shell
brew install watchman; brew upgrade watchman
```

## Node Version Manager

Node Version Manager (nvm) is a tool that ensures we use the same version of Node on our server between prod and dev environments.

```shell
brew install nvm; brew upgrade nvm
```

After installing, Homebrew will print out some instructions under the Caveats section of its output. It will ask you to do two things: `mkdir ~/.nvm`, and to add some lines to your `~/.bash_profile` (or desired shell configuration file). We recommend that you append `--no-use` to the line that loads nvm, so that you continue to use your Homebrew-sourced Node distribution by default:

```shell
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh" --no-use # This loads nvm
[ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && . "/usr/local/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
```

Now either close and reopen your terminal window or re-source your shell configuration file in order to load nvm:

```shell
source ~/.bash_profile
```

## MySQL

For now we’re using MySQL 5.7 as the primary server-side database. Hopefully we’ll change this soon, but for now, install MySQL 5.7 using Homebrew.

```shell
brew install mysql@5.7; brew upgrade mysql@5.7
```

Next we’ll configure MySQL to start when your computer boots using `brew services`:

```shell
brew tap homebrew/services
brew services start mysql@5.7
```

We’ll also want to link MySQL so that you can run CLI commands:

```shell
brew link mysql@5.7 --force
```

Finally, you should set up a root password for your local MySQL instance:

```shell
mysqladmin -u root password
```

## Redis

We use Redis on the server side as a message broker.

```shell
brew install redis; brew upgrade redis
```

We’ll set it up to start on boot with `brew services`:

```shell
brew services start redis
```

## CocoaPods

CocoaPods is a dependency management system for iOS development. React Native uses it to manage native modules.

```shell
brew install cocoapods; brew upgrade cocoapods
```

## Reactotron

Reactotron is an event tracker and logger that can be used to aid in debugging on React Native.

```shell
brew install reactotron; brew upgrade reactotron
```

## React Dev Tools Chrome extension

The React Dev Tools Chrome extension lets you inspect the React component tree for web applications in Chrome. You can install it by navigating [here](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) on Chrome.

## Redux Dev Tools Chrome extension

The Redux Dev Tools Chrome extension lets you watch for Redux actions and inspect the Redux store state, both for web applications in Chrome, but also for our native applications using the “Remote DevTools” functionality. To install it, navigate [here](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) on Chrome.

## JDK

We’ll need the Java Development Kit (JDK) for Android development. We’re using [SDKMAN!](https://sdkman.io/) to manage our JDK installation.

Run the following to install SDKMAN!:

```shell
curl -s "https://get.sdkman.io" | bash
```

Now either close and reopen your terminal window or re-source your `~/.bash_profile` (or desired shell configuration file) in order to load SDKMAN!:

```shell
source ~/.bash_profile
```

You can run `sdk version` to see if SDKMAN! was installed properly.

Run the following to install Azul Zulu 11 with SDKMAN!:

```shell
sdk install java 11.0.13-zulu
```

SDKMAN! takes care of setting up the `$JAVA_HOME` environment variable to point to the newly installed JDK. You can verify this by running `echo $JAVA_HOME`.

## Android Studio

Start by downloading and installing [Android Studio](https://developer.android.com/studio/index.html) for your platform. When prompted to choose an installation type, select “Custom”.

You’ll be prompted to select a JDK installation. If your SDKMAN!-sourced JDK doesn’t appear in the dropdown, you can find the absolute path to your installed JDK with the following command:

```shell
sdk home java 11.0.13-zulu
```

Make sure you check the boxes for the following:

<Tabs groupId="chipset">
  <TabItem value="silicon" label="Apple silicon">
    <ul>
      <li> Android SDK </li>
      <li> Android SDK Platform </li>
      <li> Android Virtual Device </li>
    </ul>
  </TabItem>
  <TabItem value="x86-64" label="Intel x86-64">
    <ul>
      <li> Android SDK </li>
      <li> Android SDK Platform </li>
      <li> Performance (Intel ® HAXM) </li>
      <li> Android Virtual Device </li>
    </ul>
  </TabItem>
</Tabs>

### Android SDK

Android Studio installs the latest Android SDK by default, but since React Native uses the Android 11 SDK specifically, we’ll need to install it using Android Studio’s SDK Manager. You can access the SDK Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, under “Configure”. If you already have a project open, you can access it from Tools → SDK Manager.

Once you have the SDK Manager open, select the “SDK Platforms” tab, and then check the box for “Show Package Details”. Now expand the “Android 11 (R)” section, and make sure the following subsections are checked:

<Tabs groupId="chipset">
  <TabItem value="silicon" label="Apple silicon">
    <ul>
      <li> Android SDK Platform 30 </li>
      <li> Google Play ARM 64 v8a System Image </li>
    </ul>
  </TabItem>
  <TabItem value="x86-64" label="Intel x86-64">
    <ul>
      <li> Android SDK Platform 30 </li>
      <li> Intel x86 Atom_64 System Image or Google APIs Intel x86 Atom System Image </li>
    </ul>
  </TabItem>
</Tabs>

Next, select the “SDK Tools” tab, and check the box for “Show Package Details”. Refer to `native/android/build.gradle` for specific tool versions and install the following:

- Android SDK Build-Tools
- NDK
- CMake version 3.10.2

To finish the SDK Manager step, click “Apply” to download and install everything you’ve selected.

### Enable Android CLI commands

You’ll need to append the following lines to your `~/.bash_profile` (or desired shell configuration file) in order for React Native to be able to build your Android project.

```shell
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Now either close and reopen your terminal window or re-source your shell configuration file in order to run the new commands:

```shell
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

```shell
brew tap facebook/fb
brew install idb-companion
pip3 install --user --upgrade fb-idb
```

Since we run `pip3 install` with `--user` instead of running it with `sudo`, the `idb` executable gets installed in your userdir. For me, running MacOS with Python 3.9, it got installed in `~/Library/Python/3.9/bin/idb`. For Flipper to be able to talk to `idb`, you’ll need to set the IDB Binary Location in the Flipper Settings.

:::note
If you have trouble getting Flipper to work with a physical iOS device, it may be due to Python weirdness. The above steps have been tested with Python 3.9 sourced from Homebrew. Let @ashoat know if you have any trouble!
:::

### Codegen for gRPC

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

```shell
git clone https://github.com/phacility/arcanist.git
```

Next, you’ll need to add the path `./arcanist/bin` to your `$PATH` in your `~/.bash_profile` (or desired shell configuration file):

```shell
export PATH=$PATH:~/src/arcanist/bin
```

Make sure to replace the `~/src` portion of the above with the location of the directory you installed Arcanist in.

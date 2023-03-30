# Nix mobile prerequisites

## iOS development

### Installing Xcode

Go to the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) to install Xcode, or if you already have it, to update it to the latest version.

Once Xcode is installed, open it up. If you are prompted, follow the instructions to install any “Additional Required Components”.

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

## Android development

### JDK

We’ll need the Java Development Kit (JDK) for Android development. While the Nix development environment provides JDK 11 when you run `nix develop`, development with Android Studio occurs outside of the Nix environment, and as such will require a standalone install.

We’re using [SDKMAN!](https://sdkman.io/) to manage our JDK installation. Run the following to install SDKMAN!:

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

### Android Studio

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

### Android Emulator

In order to test the Android app on your computer you’ll need to set up an Android Emulator. To do this we’ll need to open up the Virtual Device Manager in Android Studio. You can access the Virtual Device Manager from the “Welcome to Android Studio” screen that pops up when you first open the application, from More Actions → Virtual Device Manager. If you already have a project open, you can access it from Tools → Virtual Device Manager.

With the Virtual Device Manager open, select “Create device” on the top left. Feel free to select any “device definition” that includes Play Store support.

On the next screen you’ll be asked to select a system image. Go for the latest version of Android that’s been released.

From there you can just hit Next and then Finish. You should then be able to start your new Android Virtual Device from the Virtual Device Manager.

## Debugging tools

### Reactotron

Reactotron is an event tracker and logger that can be used to aid in debugging on React Native.

```
brew install reactotron && brew upgrade reactotron
```

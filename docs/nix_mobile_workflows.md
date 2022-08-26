# Mobile workflows

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

This command runs two processes. The first is the Metro bundler, which handles bundling our app’s JavaScript code and communicating with the debug build of the app running on either a physical or virtual device. The second is the `remotedev-server` for Redux, which is a proxy of sorts through which the Redux monitor (running in the Chrome extension) can communicate with the debug build of the app.

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

This command runs two processes (see previous section for details).

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

  1.  You may need to use a real production account for this, since the server address will default to the production server if this is the first build you’ve deployed to the target device.
  2.  Next, in order for the “Developer tools” menu option to appear, you’ll need to add your user ID to [the list of user IDs in `staff.json`](https://github.com/CommE2E/comm/blob/master/lib/facts/staff.json). A good way to figure out your user ID is to use the Chrome Redux debugger to inspect the `currentUserInfo` property when logged into the web app.
  3.  Finally, you should be able to navigate to Profile → Developer tools in the app and set the address of the local server. It should look something like this:

      ```
      http://w.x.y.z/comm
      ```

      Where `w.x.y.z` is the local IP address you found earlier.

- Alternately, if you’re on a release build and option 2 above seems like too much of a hassle, you should be able to simply change the value of [`productionNodeServerURL` in the code](https://github.com/CommE2E/comm/blob/9e6a13f1569787b498a72c890b12ce0dd8323804/native/utils/url-utils.js#L12). Note that you’ll need to delete and reinstall the app for this change to take effect, as the default production URL is persisted in Redux.

# Mobile workflows

## Flow typechecker

It’s good to run the `flow` typechecker frequently to make sure you’re not introducing any type errors. Flow treats each Yarn Workspace as a separate environment, and as such runs a separate type-checking server for each.

You should now be able to run `flow` in any of the Yarn workspaces:

```
cd native
flow
```

## Running keyserver

To work on the iOS or Android app, you’ll first need to run the keyserver locally.

Open a new terminal and run:

```
cd keyserver
yarn dev
```

This command runs three processes. The first two are to keep the `dist` folder updated whenever the `src` folder changes. They are “watch” versions of the same Babel and `rsync` commands we used to initially create the `dist` folder (before running the `generate-olm-config.js` script above). The final process is `nodemon`, which is similar to `node` except that it restarts whenever any of its source files (in the `dist` directory) changes.

Note that if you run `yarn dev` in `keyserver` right after `yarn cleaninstall`, before Webpack is given a chance to build `app.build.cjs`/`landing.build.cjs` files, then Node will crash when it attempts to import those files. Just make sure to run `yarn dev` (or `yarn prod`) in `web` or `landing` before attempting to load the corresponding webpages.

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

### Building and deploying the app

When you plug your iOS device into your machine for the first time, you’ll be prompted to enter your device passcode to enable debugging and deployment. Click the “Register” button in the dialog that Xcode displays if your device needs to be added to your Provisioning Profile.

Make sure to pull the latest changes and clean the build folder before trying to deploy a build to your device. In Xcode, run Product → Clean Build Folder.

If you’re running a debug build, you’ll need to check that the Metro bundler is running. If you haven’t already, open a new terminal and run:

```
cd native
yarn dev
```

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

  1.  You may need to use a real production account for this, since the server address will default to the production server if this is the first build you’ve deployed to the target device.
  2.  Next, in order for the “Developer tools” menu option to appear, you’ll need to add your user ID to [the list of user IDs in `staff.json`](https://github.com/CommE2E/comm/blob/master/lib/facts/staff.json). A good way to figure out your user ID is to use the Chrome Redux debugger to inspect the `currentUserInfo` property when logged into the web app.
  3.  Finally, you should be able to navigate to Profile → Developer tools in the app and set the address of the local server. It should look something like this:

      ```
      http://w.x.y.z/comm
      ```

      Where `w.x.y.z` is the local IP address you found earlier.

- Alternately, if you’re on a release build and option 2 above seems like too much of a hassle, you should be able to simply change the value of [`productionNodeServerURL` in the code](https://github.com/CommE2E/comm/blob/9e6a13f1569787b498a72c890b12ce0dd8323804/native/utils/url-utils.js#L12). Note that you’ll need to delete and reinstall the app for this change to take effect, as the default production URL is persisted in Redux.

## Debugging

### React Developer Tools

You can access the React Developer Tools by running `cd native && yarn react-devtools`. If you want to use it along with the JS debugger (see [Debugging JavaScript](#debugging-javascript)), you should open the JS debugger first, then open React Developer Tools, and finally refresh the app via the dev menu. More details on using React Developer Tools with React Native can be found [here](https://github.com/facebook/react/tree/main/packages/react-devtools#usage-with-react-native).

### Redux Developer Tools

You can access the Redux Developer Tools by running `cd native && yarn redux-devtools`. On the first open, you’ll need to go to “Settings”, select “Use custom (local) server”, configure it to use port 8043, and then finally hit “Connect”. If you want to use it along with the JS debugger (see [Debugging JavaScript](#debugging-javascript)), you should open the JS debugger first, then open Redux Developer Tools, and finally refresh the app via the dev menu.

### Debugging JavaScript

You can use the dev menu in dev builds to open up a JS debugger, where you can set breakpoints via the `debugger` expression.

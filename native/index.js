// @flow

/* eslint-disable import/order */

import 'react-native-gesture-handler';

// react-native has an issue with inverted lists on Android, and it got worse
// with Android 13. To avoid it we patch a react-native style, but that style
// got deprecated in React Native 0.70. For now the deprecation is limited to a
// JS runtime check, which we disable here.
import ViewReactNativeStyleAttributes from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes.js';
ViewReactNativeStyleAttributes.scaleY = true;

import './reactotron.js';
import './config.js';

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import Root from './root.react.js';

AppRegistry.registerComponent(appName, () => Root);

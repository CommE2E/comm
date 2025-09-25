// @flow

import 'react-native-gesture-handler';

import './reactotron.js';
import './config.js';

import { AppRegistry } from 'react-native';

import { expo } from './app.json';
import Root from './root.react.js';

const appName = expo.name;
AppRegistry.registerComponent(appName, () => Root);

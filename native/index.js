// @flow

import 'react-native-gesture-handler';

import './reactotron.js';
import './config.js';

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import Root from './root.react.js';

AppRegistry.registerComponent(appName, () => Root);

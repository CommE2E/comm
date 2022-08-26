// @flow

import './shim';
import 'react-native-gesture-handler';
import './reactotron';
import './config';

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import Root from './root.react';

AppRegistry.registerComponent(appName, () => Root);

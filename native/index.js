// @flow

import 'react-native-gesture-handler';
import './reactotron';
import './config';

import { AppRegistry } from 'react-native';

import Root from './root.react';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => Root);

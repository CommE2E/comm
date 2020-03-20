// @flow

import './reactotron';
import './config';

import { AppRegistry } from 'react-native';

import App from './app.react';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

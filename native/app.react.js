// @flow

import React from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { TabNavigator } from 'react-navigation';

import Calendar from './calendar/calendar.react';
import Chat from './chat/chat.react';
import More from './more/more.react';

const App = TabNavigator({
  Calendar: { screen: Calendar },
  Chat: { screen: Chat },
  More: { screen: More },
});

AppRegistry.registerComponent('SquadCal', () => App);

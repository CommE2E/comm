// @flow

import { TabNavigator, StackNavigator } from 'react-navigation';

import Calendar from './calendar/calendar.react';
import Chat from './chat/chat.react';
import More from './more/more.react';
import LogIn from './account/log-in-modal.react';

const AppNavigator = TabNavigator(
  {
    Calendar: { screen: Calendar },
    Chat: { screen: Chat },
    More: { screen: More },
  },
  {
    initialRouteName: 'Calendar',
  },
);

export const RootNavigator = StackNavigator(
  {
    LogIn: { screen: LogIn },
    App: { screen: AppNavigator },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

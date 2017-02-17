// @flow

import { TabNavigator, StackNavigator } from 'react-navigation';

import Calendar from './calendar/calendar.react';
import Chat from './chat/chat.react';
import More from './more/more.react';
import LoggedOutModal from './account/logged-out-modal.react';

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
    LoggedOutModal: { screen: LoggedOutModal },
    App: { screen: AppNavigator },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export const defaultNavigationState = {
  index: 1,
  routes: [
    {
      key: 'App',
      routeName: 'App',
      index: 0,
      routes: [
        { key: 'Calendar', routeName: 'Calendar' },
        { key: 'Chat', routeName: 'Chat' },
        { key: 'More', routeName: 'More' },
      ],
    },
    { key: 'LoggedOutModal', routeName: 'LoggedOutModal' },
  ],
};

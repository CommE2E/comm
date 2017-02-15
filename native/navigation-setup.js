// @flow

import React from 'react';
import { TabNavigator } from 'react-navigation';

import Calendar from './calendar/calendar.react';
import Chat from './chat/chat.react';
import More from './more/more.react';

type NavigationRoute = {
  key: string,
  title?: string,
};

export type NavigationState = {
  index: number,
  routes: NavigationRoute[],
};

const navigationRoute = React.PropTypes.shape({
  key: React.PropTypes.string.isRequired,
});

export const navigationState = React.PropTypes.shape({
  index: React.PropTypes.number.isRequired,
  routes: React.PropTypes.arrayOf(navigationRoute),
});

export const AppNavigator = TabNavigator({
  Calendar: { screen: Calendar },
  Chat: { screen: Chat },
  More: { screen: More },
});

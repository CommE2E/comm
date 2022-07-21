// @flow

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as React from 'react';

import { unreadCount } from 'lib/selectors/thread-selectors';

import AppsDirectory from '../apps/apps-directory.react';
import Calendar from '../calendar/calendar.react';
import Chat from '../chat/chat.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import Profile from '../profile/profile.react';
import { useSelector } from '../redux/redux-utils';
import type { RootNavigationProp } from './root-navigator.react';
import {
  CalendarRouteName,
  ChatRouteName,
  ProfileRouteName,
  AppsRouteName,
  type ScreenParamList,
  type TabParamList,
} from './route-names';
import { tabBar } from './tab-bar.react';

const calendarTabOptions = {
  tabBarLabel: 'Calendar',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="calendar" style={[styles.icon, { color }]} />
  ),
};
const getChatTabOptions = (badge: number) => ({
  tabBarLabel: 'Inbox',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="message-square" style={[styles.icon, { color }]} />
  ),
  tabBarBadge: badge ? badge : undefined,
});
const profileTabOptions = {
  tabBarLabel: 'Profile',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="user-circle" style={[styles.icon, { color }]} />
  ),
};
const appsTabOptions = {
  tabBarLabel: 'Apps',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="globe-1" style={[styles.icon, { color }]} />
  ),
};

export type TabNavigationProp<
  RouteName: $Keys<TabParamList> = $Keys<TabParamList>,
> = BottomTabNavigationProp<ScreenParamList, RouteName>;

type TabNavigationProps = {
  navigation: RootNavigationProp<'TabNavigator'>,
  ...
};
const Tab = createBottomTabNavigator<
  ScreenParamList,
  TabParamList,
  TabNavigationProp<>,
>();

const tabBarOptions = {
  keyboardHidesTabBar: false,
  activeTintColor: '#AE94DB',
  style: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
  },
};

// eslint-disable-next-line no-unused-vars
function TabNavigator(props: TabNavigationProps): React.Node {
  const chatBadge = useSelector(unreadCount);
  const isCalendarEnabled = useSelector(state => state.enabledApps.calendar);

  let calendarTab;
  if (isCalendarEnabled) {
    calendarTab = (
      <Tab.Screen
        name={CalendarRouteName}
        component={Calendar}
        options={calendarTabOptions}
      />
    );
  }

  return (
    <Tab.Navigator
      initialRouteName={ChatRouteName}
      lazy={false}
      tabBar={tabBar}
      backBehavior="none"
      tabBarOptions={tabBarOptions}
    >
      {calendarTab}
      <Tab.Screen
        name={ChatRouteName}
        component={Chat}
        options={getChatTabOptions(chatBadge)}
      />
      <Tab.Screen
        name={ProfileRouteName}
        component={Profile}
        options={profileTabOptions}
      />
      <Tab.Screen
        name={AppsRouteName}
        component={AppsDirectory}
        options={appsTabOptions}
      />
    </Tab.Navigator>
  );
}

const styles = {
  icon: {
    fontSize: 28,
  },
};

export default TabNavigator;

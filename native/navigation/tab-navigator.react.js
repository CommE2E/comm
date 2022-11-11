// @flow

import type {
  BottomTabNavigationHelpers,
  BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as React from 'react';

import { unreadCount } from 'lib/selectors/thread-selectors';

import AppsDirectory from '../apps/apps-directory.react';
import Calendar from '../calendar/calendar.react';
import Chat from '../chat/chat.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import Profile from '../profile/profile.react';
import { useSelector } from '../redux/redux-utils';
import { useColors } from '../themes/colors';
import {
  CalendarRouteName,
  ChatRouteName,
  ProfileRouteName,
  AppsRouteName,
  type ScreenParamList,
  type TabParamList,
} from './route-names';
import type { NavigationRoute } from './route-names';
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
    <SWMansionIcon name="user-2" style={[styles.icon, { color }]} />
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

const Tab = createBottomTabNavigator<
  ScreenParamList,
  TabParamList,
  BottomTabNavigationHelpers<ScreenParamList>,
>();
type Props = {
  +navigation: TabNavigationProp<'TabNavigator'>,
  +route: NavigationRoute<'TabNavigator'>,
};
// eslint-disable-next-line no-unused-vars
function TabNavigator(props: Props): React.Node {
  const colors = useColors();
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

  const tabBarScreenOptions = React.useMemo(
    () => ({
      headerShown: false,
      tabBarHideOnKeyboard: false,
      tabBarActiveTintColor: colors.tabBarActiveTintColor,
      tabBarStyle: {
        backgroundColor: colors.tabBarBackground,
        borderTopWidth: 1,
      },
      lazy: false,
    }),
    [colors.tabBarActiveTintColor, colors.tabBarBackground],
  );

  return (
    <Tab.Navigator
      initialRouteName={ChatRouteName}
      tabBar={tabBar}
      backBehavior="none"
      screenOptions={tabBarScreenOptions}
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

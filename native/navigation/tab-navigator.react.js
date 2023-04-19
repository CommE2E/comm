// @flow

import type {
  BottomTabNavigationHelpers,
  BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as React from 'react';

import { unreadCount } from 'lib/selectors/thread-selectors.js';

import CommunityDrawerButton from './community-drawer-button.react.js';
import type { CommunityDrawerNavigationProp } from './community-drawer-navigator.react.js';
import {
  CalendarRouteName,
  ChatRouteName,
  ProfileRouteName,
  AppsRouteName,
  type ScreenParamList,
  type TabParamList,
  type NavigationRoute,
} from './route-names.js';
import { tabBar } from './tab-bar.react.js';
import AppsDirectory from '../apps/apps-directory.react.js';
import Calendar from '../calendar/calendar.react.js';
import Chat from '../chat/chat.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import Profile from '../profile/profile.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors } from '../themes/colors.js';

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
  +navigation: CommunityDrawerNavigationProp<'TabNavigator'>,
  +route: NavigationRoute<'TabNavigator'>,
};
function TabNavigator(props: Props): React.Node {
  const colors = useColors();
  const chatBadge = useSelector(unreadCount);
  const isCalendarEnabled = useSelector(state => state.enabledApps.calendar);

  const headerLeft = React.useCallback(
    () => <CommunityDrawerButton navigation={props.navigation} />,
    [props.navigation],
  );

  const headerCommonOptions = React.useMemo(
    () => ({
      headerShown: true,
      headerLeft,
      headerStyle: {
        backgroundColor: colors.tabBarBackground,
      },
      headerShadowVisible: false,
    }),
    [colors.tabBarBackground, headerLeft],
  );

  const calendarOptions = React.useMemo(
    () => ({ ...calendarTabOptions, ...headerCommonOptions }),
    [headerCommonOptions],
  );

  let calendarTab;
  if (isCalendarEnabled) {
    calendarTab = (
      <Tab.Screen
        name={CalendarRouteName}
        component={Calendar}
        options={calendarOptions}
      />
    );
  }

  const appsOptions = React.useMemo(
    () => ({ ...appsTabOptions, ...headerCommonOptions }),
    [headerCommonOptions],
  );

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
      <Tab.Screen
        name={ChatRouteName}
        component={Chat}
        options={getChatTabOptions(chatBadge)}
      />
      {calendarTab}
      <Tab.Screen
        name={ProfileRouteName}
        component={Profile}
        options={profileTabOptions}
      />
      <Tab.Screen
        name={AppsRouteName}
        component={AppsDirectory}
        options={appsOptions}
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

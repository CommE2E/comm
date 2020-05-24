// @flow

import type { OverlayRouterNavigationProp } from './overlay-router';
import type { RootNavigationProp } from './root-navigator.react';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { LeafRoute } from '@react-navigation/native';

import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PersistGate } from 'redux-persist/integration/react';
import SplashScreen from 'react-native-splash-screen';
import { Platform, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {
  CalendarRouteName,
  ChatRouteName,
  MoreRouteName,
  TabNavigatorRouteName,
  MultimediaModalRouteName,
  MultimediaTooltipModalRouteName,
  ActionResultModalRouteName,
  TextMessageTooltipModalRouteName,
  ThreadSettingsMemberTooltipModalRouteName,
  CameraModalRouteName,
} from './route-names';
import Calendar from '../calendar/calendar.react';
import Chat from '../chat/chat.react';
import More from '../more/more.react';
import TabBar from './tab-bar.react';
import { createOverlayNavigator } from './overlay-navigator.react';
import MultimediaModal, {
  type MultimediaModalParams,
} from '../media/multimedia-modal.react';
import {
  MultimediaTooltipModal,
  type MultimediaTooltipModalParams,
} from '../chat/multimedia-tooltip-modal.react';
import ActionResultModal, {
  type ActionResultModalParams,
} from './action-result-modal.react';
import {
  TextMessageTooltipModal,
  type TextMessageTooltipModalParams,
} from '../chat/text-message-tooltip-modal.react';
import ThreadSettingsMemberTooltipModal, {
  type ThreadSettingsMemberTooltipModalParams,
} from '../chat/settings/thread-settings-member-tooltip-modal.react';
import CameraModal, {
  type CameraModalParams,
} from '../media/camera-modal.react';
import KeyboardStateContainer from '../keyboard/keyboard-state-container.react';
import PushHandler from '../push/push-handler.react';
import { getPersistor } from '../redux/persist';
import { RootContext } from '../root-context';
import { waitForInteractions } from '../utils/interactions';
import ChatIcon from '../chat/chat-icon.react';

const calendarTabOptions = {
  tabBarLabel: 'Calendar',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <Icon name="calendar" style={[styles.icon, { color }]} />
  ),
};
const chatTabOptions = {
  tabBarLabel: 'Chat',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => <ChatIcon color={color} />,
};
const moreTabOptions = {
  tabBarLabel: 'More',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <Icon name="bars" style={[styles.icon, { color }]} />
  ),
};

type TabParamList = {
  Calendar: void,
  Chat: void,
  More: void,
};
export type TabNavigationRoute<RouteName: string> = {|
  ...LeafRoute<RouteName>,
  +params: $ElementType<TabParamList, RouteName>,
|};
export type TabNavigationProp<RouteName: string> = BottomTabNavigationProp<
  TabParamList,
  RouteName,
>;

const Tab = createBottomTabNavigator();
const tabBarOptions = { keyboardHidesTabBar: false };
function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={ChatRouteName}
      lazy={false}
      tabBar={TabBar}
      backBehavior="none"
      tabBarOptions={tabBarOptions}
    >
      <Tab.Screen
        name={CalendarRouteName}
        component={Calendar}
        options={calendarTabOptions}
      />
      <Tab.Screen
        name={ChatRouteName}
        component={Chat}
        options={chatTabOptions}
      />
      <Tab.Screen
        name={MoreRouteName}
        component={More}
        options={moreTabOptions}
      />
    </Tab.Navigator>
  );
}

export type TooltipModalParamList = {
  MultimediaTooltipModal: MultimediaTooltipModalParams,
  TextMessageTooltipModal: TextMessageTooltipModalParams,
  ThreadSettingsMemberTooltipModal: ThreadSettingsMemberTooltipModalParams,
};
type AppParamList = {
  ...TooltipModalParamList,
  TabNavigator: void,
  MultimediaModal: MultimediaModalParams,
  ActionResultModal: ActionResultModalParams,
  CameraModal: CameraModalParams,
};
export type AppNavigationRoute<RouteName: string> = {|
  ...LeafRoute<RouteName>,
  +params: $ElementType<AppParamList, RouteName>,
|};
export type AppNavigationProp<RouteName: string> = OverlayRouterNavigationProp<
  AppParamList,
  RouteName,
>;

const App = createOverlayNavigator();
type AppNavigatorProps = {|
  navigation: RootNavigationProp<'App'>,
|};
function AppNavigator(props: AppNavigatorProps) {
  const { navigation } = props;

  const rootContext = React.useContext(RootContext);
  const setNavStateInitialized =
    rootContext && rootContext.setNavStateInitialized;
  React.useEffect(() => {
    setNavStateInitialized && setNavStateInitialized();
  }, [setNavStateInitialized]);

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      waitForInteractions().then(() => SplashScreen.hide());
    } else {
      SplashScreen.hide();
    }
  }, []);

  return (
    <KeyboardStateContainer>
      <App.Navigator>
        <App.Screen
          name={TabNavigatorRouteName}
          component={TabNavigator}
        />
        <App.Screen
          name={MultimediaModalRouteName}
          component={MultimediaModal}
        />
        <App.Screen
          name={MultimediaTooltipModalRouteName}
          component={MultimediaTooltipModal}
        />
        <App.Screen
          name={ActionResultModalRouteName}
          component={ActionResultModal}
        />
        <App.Screen
          name={TextMessageTooltipModalRouteName}
          component={TextMessageTooltipModal}
        />
        <App.Screen
          name={ThreadSettingsMemberTooltipModalRouteName}
          component={ThreadSettingsMemberTooltipModal}
        />
        <App.Screen
          name={CameraModalRouteName}
          component={CameraModal}
        />
      </App.Navigator>
      <PersistGate persistor={getPersistor()}>
        <PushHandler navigation={navigation} />
      </PersistGate>
    </KeyboardStateContainer>
  );
}

const styles = {
  icon: {
    fontSize: 28,
  },
};

export default AppNavigator;

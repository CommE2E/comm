// @flow

import type { OverlayRouterNavigationProp } from './overlay-router';
import type { RootNavigationProp } from './root-navigator.react';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PersistGate } from 'redux-persist/integration/react';
import * as SplashScreen from 'expo-splash-screen';
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
  RelationshipListItemTooltipModalRouteName,
  CameraModalRouteName,
  type ScreenParamList,
  type TabParamList,
  type OverlayParamList,
} from './route-names';
import Calendar from '../calendar/calendar.react';
import Chat from '../chat/chat.react';
import More from '../more/more.react';
import { tabBar } from './tab-bar.react';
import { createOverlayNavigator } from './overlay-navigator.react';
import MultimediaModal from '../media/multimedia-modal.react';
import { MultimediaTooltipModal } from '../chat/multimedia-tooltip-modal.react';
import ActionResultModal from './action-result-modal.react';
import { TextMessageTooltipModal } from '../chat/text-message-tooltip-modal.react';
import ThreadSettingsMemberTooltipModal from '../chat/settings/thread-settings-member-tooltip-modal.react';
import RelationshipListItemTooltipModal from '../more/relationship-list-item-tooltip-modal.react';
import CameraModal from '../media/camera-modal.react';
import KeyboardStateContainer from '../keyboard/keyboard-state-container.react';
import PushHandler from '../push/push-handler.react';
import { getPersistor } from '../redux/persist';
import { RootContext } from '../root-context';
import { waitForInteractions } from '../utils/interactions';
import ChatIcon from '../chat/chat-icon.react';

let splashScreenHasHidden = false;

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

export type TabNavigationProp<
  RouteName: $Keys<TabParamList> = $Keys<TabParamList>,
> = BottomTabNavigationProp<ScreenParamList, RouteName>;

const Tab = createBottomTabNavigator<
  ScreenParamList,
  TabParamList,
  TabNavigationProp<>,
>();
const tabBarOptions = { keyboardHidesTabBar: false };
function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={ChatRouteName}
      lazy={false}
      tabBar={tabBar}
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

export type AppNavigationProp<
  RouteName: $Keys<OverlayParamList> = $Keys<OverlayParamList>,
> = OverlayRouterNavigationProp<ScreenParamList, RouteName>;

const App = createOverlayNavigator<
  ScreenParamList,
  OverlayParamList,
  AppNavigationProp<>,
>();
type AppNavigatorProps = {
  navigation: RootNavigationProp<'App'>,
};
function AppNavigator(props: AppNavigatorProps) {
  const { navigation } = props;

  const rootContext = React.useContext(RootContext);
  const setNavStateInitialized =
    rootContext && rootContext.setNavStateInitialized;
  React.useEffect(() => {
    setNavStateInitialized && setNavStateInitialized();
  }, [setNavStateInitialized]);

  const [
    localSplashScreenHasHidden,
    setLocalSplashScreenHasHidden,
  ] = React.useState(splashScreenHasHidden);

  React.useEffect(() => {
    if (localSplashScreenHasHidden) {
      return;
    }
    splashScreenHasHidden = true;
    (async () => {
      await waitForInteractions();
      try {
        await SplashScreen.hideAsync();
        setLocalSplashScreenHasHidden(true);
      } catch {}
    })();
  }, [localSplashScreenHasHidden]);

  let pushHandler;
  if (localSplashScreenHasHidden) {
    pushHandler = (
      <PersistGate persistor={getPersistor()}>
        <PushHandler navigation={navigation} />
      </PersistGate>
    );
  }

  return (
    <KeyboardStateContainer>
      <App.Navigator>
        <App.Screen name={TabNavigatorRouteName} component={TabNavigator} />
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
          name={RelationshipListItemTooltipModalRouteName}
          component={RelationshipListItemTooltipModal}
        />
        <App.Screen name={CameraModalRouteName} component={CameraModal} />
      </App.Navigator>
      {pushHandler}
    </KeyboardStateContainer>
  );
}

const styles = {
  icon: {
    fontSize: 28,
  },
};

export default AppNavigator;

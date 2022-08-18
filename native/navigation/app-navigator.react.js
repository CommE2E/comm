// @flow

import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { PersistGate } from 'redux-persist/integration/react';

import { unreadCount } from 'lib/selectors/thread-selectors';

import AppsDirectory from '../apps/apps-directory.react';
import Calendar from '../calendar/calendar.react';
import Chat from '../chat/chat.react';
import { MultimediaMessageTooltipModal } from '../chat/multimedia-message-tooltip-modal.react';
import { RobotextMessageTooltipModal } from '../chat/robotext-message-tooltip-modal.react';
import ThreadSettingsMemberTooltipModal from '../chat/settings/thread-settings-member-tooltip-modal.react';
import { TextMessageTooltipModal } from '../chat/text-message-tooltip-modal.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import { type SQLiteContextType, SQLiteContext } from '../data/sqlite-context';
import KeyboardStateContainer from '../keyboard/keyboard-state-container.react';
import CameraModal from '../media/camera-modal.react';
import ImageModal from '../media/image-modal.react';
import VideoPlaybackModal from '../media/video-playback-modal.react';
import Profile from '../profile/profile.react';
import RelationshipListItemTooltipModal from '../profile/relationship-list-item-tooltip-modal.react';
import PushHandler from '../push/push-handler.react';
import { getPersistor } from '../redux/persist';
import { useSelector } from '../redux/redux-utils';
import { RootContext } from '../root-context';
import { waitForInteractions } from '../utils/timers';
import ActionResultModal from './action-result-modal.react';
import { createOverlayNavigator } from './overlay-navigator.react';
import type { OverlayRouterNavigationProp } from './overlay-router';
import type { RootNavigationProp } from './root-navigator.react';
import {
  CalendarRouteName,
  ChatRouteName,
  ProfileRouteName,
  TabNavigatorRouteName,
  ImageModalRouteName,
  MultimediaMessageTooltipModalRouteName,
  ActionResultModalRouteName,
  TextMessageTooltipModalRouteName,
  ThreadSettingsMemberTooltipModalRouteName,
  RelationshipListItemTooltipModalRouteName,
  RobotextMessageTooltipModalRouteName,
  CameraModalRouteName,
  VideoPlaybackModalRouteName,
  AppsRouteName,
  type ScreenParamList,
  type TabParamList,
  type OverlayParamList,
} from './route-names';
import { tabBar } from './tab-bar.react';

let splashScreenHasHidden = false;

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
function TabNavigator() {
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
  ...
};
function AppNavigator(props: AppNavigatorProps): React.Node {
  const { navigation } = props;

  const rootContext = React.useContext(RootContext);
  const localDatabaseContext: ?SQLiteContextType = React.useContext(
    SQLiteContext,
  );
  const storeLoadedFromLocalDatabase = localDatabaseContext?.storeLoaded;
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
      } finally {
        setLocalSplashScreenHasHidden(true);
      }
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
  if (!storeLoadedFromLocalDatabase) {
    return null;
  }
  return (
    <KeyboardStateContainer>
      <App.Navigator>
        <App.Screen name={TabNavigatorRouteName} component={TabNavigator} />
        <App.Screen name={ImageModalRouteName} component={ImageModal} />
        <App.Screen
          name={MultimediaMessageTooltipModalRouteName}
          component={MultimediaMessageTooltipModal}
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
        <App.Screen
          name={RobotextMessageTooltipModalRouteName}
          component={RobotextMessageTooltipModal}
        />
        <App.Screen name={CameraModalRouteName} component={CameraModal} />
        <App.Screen
          name={VideoPlaybackModalRouteName}
          component={VideoPlaybackModal}
        />
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

// @flow

import type { NavigationStackProp } from 'react-navigation-stack';
import type { NavigationStateRoute } from 'react-navigation';

import * as React from 'react';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { PersistGate } from 'redux-persist/integration/react';
import { BackHandler } from 'react-native';

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
  AppRouteName,
} from './route-names';
import Calendar from '../calendar/calendar.react';
import Chat from '../chat/chat.react';
import More from '../more/more.react';
import TabBar from './tab-bar.react';
import { createOverlayNavigator } from './overlay-navigator.react';
import MultimediaModal from '../media/multimedia-modal.react';
import { MultimediaTooltipModal } from '../chat/multimedia-tooltip-modal.react';
import ActionResultModal from './action-result-modal.react';
import { TextMessageTooltipModal } from '../chat/text-message-tooltip-modal.react';
import ThreadSettingsMemberTooltipModal from '../chat/settings/thread-settings-member-tooltip-modal.react';
import CameraModal from '../media/camera-modal.react';
import ChatInputStateContainer from '../chat/chat-input-state-container.react';
import OverlayableScrollViewStateContainer from './overlayable-scroll-view-state-container.react';
import KeyboardStateContainer from '../keyboard/keyboard-state-container.react';
import PushHandler from '../push/push-handler.react';
import { getPersistor } from '../redux/persist';
import { NavContext } from './navigation-context';
import { useIsAppLoggedIn } from './nav-selectors';
import { assertNavigationRouteNotLeafNode } from '../utils/navigation-utils';

const TabNavigator = createBottomTabNavigator(
  {
    [CalendarRouteName]: { screen: Calendar },
    [ChatRouteName]: { screen: Chat },
    [MoreRouteName]: { screen: More },
  },
  {
    initialRouteName: CalendarRouteName,
    lazy: false,
    tabBarComponent: TabBar,
    tabBarOptions: {
      keyboardHidesTabBar: false,
    },
  },
);

const AppNavigator = createOverlayNavigator({
  [TabNavigatorRouteName]: TabNavigator,
  [MultimediaModalRouteName]: MultimediaModal,
  [MultimediaTooltipModalRouteName]: MultimediaTooltipModal,
  [ActionResultModalRouteName]: ActionResultModal,
  [TextMessageTooltipModalRouteName]: TextMessageTooltipModal,
  [ThreadSettingsMemberTooltipModalRouteName]: ThreadSettingsMemberTooltipModal,
  [CameraModalRouteName]: CameraModal,
});

type Props = {|
  navigation: NavigationStackProp<NavigationStateRoute>,
|};
function WrappedAppNavigator(props: Props) {
  const { navigation } = props;
  const isForeground = useIsAppLoggedIn();
  const backButtonHandler = isForeground ? (
    <BackButtonHandler navigation={navigation} />
  ) : null;
  return (
    <ChatInputStateContainer>
      <OverlayableScrollViewStateContainer>
        <KeyboardStateContainer>
          <AppNavigator navigation={navigation} />
          <PersistGate persistor={getPersistor()}>
            <PushHandler navigation={navigation} />
          </PersistGate>
          {backButtonHandler}
        </KeyboardStateContainer>
      </OverlayableScrollViewStateContainer>
    </ChatInputStateContainer>
  );
}
hoistNonReactStatics(WrappedAppNavigator, AppNavigator);

function BackButtonHandler(props: Props) {
  const { navigation } = props;
  const appCanRespondToBackButton = useAppCanRespondToBackButton();
  const hardwareBack = React.useCallback(() => {
    if (!appCanRespondToBackButton) {
      return false;
    }
    navigation.goBack(null);
    return true;
  }, [appCanRespondToBackButton, navigation]);
  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', hardwareBack);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', hardwareBack);
    };
  }, [hardwareBack]);
  return null;
}

function useAppCanRespondToBackButton() {
  const navContext = React.useContext(NavContext);
  return React.useMemo(() => {
    if (!navContext) {
      return false;
    }
    const { state } = navContext;
    const currentRootSubroute = state.routes[state.index];
    if (currentRootSubroute.routeName !== AppRouteName) {
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    const currentAppSubroute = appRoute.routes[appRoute.index];
    if (currentAppSubroute.routeName !== TabNavigatorRouteName) {
      return true;
    }
    const tabRoute = assertNavigationRouteNotLeafNode(currentAppSubroute);
    const currentTabSubroute = tabRoute.routes[tabRoute.index];
    return (
      currentTabSubroute.index !== null &&
      currentTabSubroute.index !== undefined &&
      currentTabSubroute.index > 0
    );
  }, [navContext]);
}

export default WrappedAppNavigator;

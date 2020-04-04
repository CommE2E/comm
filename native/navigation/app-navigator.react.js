// @flow

import type { NavigationStackProp } from 'react-navigation-stack';
import type { NavigationStateRoute } from 'react-navigation';

import * as React from 'react';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { PersistGate } from 'redux-persist/integration/react';

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
import { RootContext } from '../root-context';

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
  const rootContext = React.useContext(RootContext);
  const setNavStateInitialized =
    rootContext && rootContext.setNavStateInitialized;
  React.useEffect(() => {
    setNavStateInitialized && setNavStateInitialized();
  }, [setNavStateInitialized]);

  const { navigation } = props;
  return (
    <ChatInputStateContainer>
      <OverlayableScrollViewStateContainer>
        <KeyboardStateContainer>
          <AppNavigator navigation={navigation} />
          <PersistGate persistor={getPersistor()}>
            <PushHandler navigation={navigation} />
          </PersistGate>
        </KeyboardStateContainer>
      </OverlayableScrollViewStateContainer>
    </ChatInputStateContainer>
  );
}
hoistNonReactStatics(WrappedAppNavigator, AppNavigator);

export default WrappedAppNavigator;

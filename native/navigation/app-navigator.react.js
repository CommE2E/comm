// @flow

import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { PersistGate } from 'redux-persist/es/integration/react.js';

import ActionResultModal from './action-result-modal.react.js';
import { CommunityDrawerNavigator } from './community-drawer-navigator.react.js';
import CommunityDrawerTip from './community-drawer-tip.react.js';
import HomeTabTip from './home-tab-tip.react.js';
import IntroTip from './intro-tip.react.js';
import MutedTabTip from './muted-tab-tip.react.js';
import NUXTipOverlayBackdrop from './nux-tip-overlay-backdrop.react.js';
import { createOverlayNavigator } from './overlay-navigator.react.js';
import type {
  OverlayNavigationProp,
  OverlayNavigationHelpers,
} from './overlay-navigator.react.js';
import type { RootNavigationProp } from './root-navigator.react.js';
import {
  HomeTabTipRouteName,
  CommunityDrawerTipRouteName,
  MutedTabTipRouteName,
  NUXTipOverlayBackdropRouteName,
  IntroTipRouteName,
} from './route-names.js';
import {
  UserAvatarCameraModalRouteName,
  ThreadAvatarCameraModalRouteName,
  ImageModalRouteName,
  MultimediaMessageTooltipModalRouteName,
  ActionResultModalRouteName,
  TextMessageTooltipModalRouteName,
  ThreadSettingsMemberTooltipModalRouteName,
  UserRelationshipTooltipModalRouteName,
  RobotextMessageTooltipModalRouteName,
  ChatCameraModalRouteName,
  VideoPlaybackModalRouteName,
  CommunityDrawerNavigatorRouteName,
  type ScreenParamList,
  type OverlayParamList,
  TogglePinModalRouteName,
} from './route-names.js';
import MultimediaMessageTooltipModal from '../chat/multimedia-message-tooltip-modal.react.js';
import RobotextMessageTooltipModal from '../chat/robotext-message-tooltip-modal.react.js';
import ThreadSettingsMemberTooltipModal from '../chat/settings/thread-settings-member-tooltip-modal.react.js';
import TextMessageTooltipModal from '../chat/text-message-tooltip-modal.react.js';
import TogglePinModal from '../chat/toggle-pin-modal.react.js';
import KeyboardStateContainer from '../keyboard/keyboard-state-container.react.js';
import ChatCameraModal from '../media/chat-camera-modal.react.js';
import ImageModal from '../media/image-modal.react.js';
import ThreadAvatarCameraModal from '../media/thread-avatar-camera-modal.react.js';
import UserAvatarCameraModal from '../media/user-avatar-camera-modal.react.js';
import VideoPlaybackModal from '../media/video-playback-modal.react.js';
import UserRelationshipTooltipModal from '../profile/user-relationship-tooltip-modal.react.js';
import PushHandler from '../push/push-handler.react.js';
import { getPersistor } from '../redux/persist.js';
import { useSelector } from '../redux/redux-utils.js';
import { RootContext } from '../root-context.js';
import { useLoadCommFonts } from '../themes/fonts.js';
import { waitForInteractions } from '../utils/timers.js';

let splashScreenHasHidden = false;

export type AppNavigationProp<
  RouteName: $Keys<OverlayParamList> = $Keys<OverlayParamList>,
> = OverlayNavigationProp<ScreenParamList, RouteName>;

const App = createOverlayNavigator<
  ScreenParamList,
  OverlayParamList,
  OverlayNavigationHelpers<ScreenParamList>,
>();
type AppNavigatorProps = {
  navigation: RootNavigationProp<'App'>,
  ...
};
function AppNavigator(props: AppNavigatorProps): React.Node {
  const { navigation } = props;

  const fontsLoaded = useLoadCommFonts();

  const rootContext = React.useContext(RootContext);
  const storeLoadedFromLocalDatabase = useSelector(
    state => state.initialStateLoaded,
  );
  const setNavStateInitialized =
    rootContext && rootContext.setNavStateInitialized;
  React.useEffect(() => {
    setNavStateInitialized && setNavStateInitialized();
  }, [setNavStateInitialized]);

  const [localSplashScreenHasHidden, setLocalSplashScreenHasHidden] =
    React.useState(splashScreenHasHidden);

  React.useEffect(() => {
    if (localSplashScreenHasHidden || !fontsLoaded) {
      return;
    }
    splashScreenHasHidden = true;
    void (async () => {
      await waitForInteractions();
      try {
        await SplashScreen.hideAsync();
      } finally {
        setLocalSplashScreenHasHidden(true);
      }
    })();
  }, [localSplashScreenHasHidden, fontsLoaded]);

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
        <App.Screen
          name={CommunityDrawerNavigatorRouteName}
          component={CommunityDrawerNavigator}
        />
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
          name={UserRelationshipTooltipModalRouteName}
          component={UserRelationshipTooltipModal}
        />
        <App.Screen
          name={RobotextMessageTooltipModalRouteName}
          component={RobotextMessageTooltipModal}
        />
        <App.Screen
          name={ChatCameraModalRouteName}
          component={ChatCameraModal}
        />
        <App.Screen
          name={UserAvatarCameraModalRouteName}
          component={UserAvatarCameraModal}
        />
        <App.Screen
          name={ThreadAvatarCameraModalRouteName}
          component={ThreadAvatarCameraModal}
        />
        <App.Screen
          name={VideoPlaybackModalRouteName}
          component={VideoPlaybackModal}
        />
        <App.Screen name={IntroTipRouteName} component={IntroTip} />
        <App.Screen
          name={CommunityDrawerTipRouteName}
          component={CommunityDrawerTip}
        />
        <App.Screen name={HomeTabTipRouteName} component={HomeTabTip} />
        <App.Screen name={MutedTabTipRouteName} component={MutedTabTip} />
        <App.Screen
          name={NUXTipOverlayBackdropRouteName}
          component={NUXTipOverlayBackdrop}
        />
        <App.Screen name={TogglePinModalRouteName} component={TogglePinModal} />
      </App.Navigator>
      {pushHandler}
    </KeyboardStateContainer>
  );
}

export default AppNavigator;

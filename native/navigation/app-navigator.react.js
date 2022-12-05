// @flow

import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import MultimediaMessageTooltipModal from '../chat/multimedia-message-tooltip-modal.react';
import RobotextMessageTooltipModal from '../chat/robotext-message-tooltip-modal.react';
import ThreadSettingsMemberTooltipModal from '../chat/settings/thread-settings-member-tooltip-modal.react';
import TextMessageTooltipModal from '../chat/text-message-tooltip-modal.react';
import KeyboardStateContainer from '../keyboard/keyboard-state-container.react';
import CameraModal from '../media/camera-modal.react';
import ImageModal from '../media/image-modal.react';
import VideoPlaybackModal from '../media/video-playback-modal.react';
import RelationshipListItemTooltipModal from '../profile/relationship-list-item-tooltip-modal.react';
import PushHandler from '../push/push-handler.react';
import { getPersistor } from '../redux/persist';
import { RootContext } from '../root-context';
import { useLoadCommFonts } from '../themes/fonts';
import { waitForInteractions } from '../utils/timers';
import ActionResultModal from './action-result-modal.react';
import { createOverlayNavigator } from './overlay-navigator.react';
import type {
  OverlayNavigationProp,
  OverlayNavigationHelpers,
} from './overlay-navigator.react';
import type { RootNavigationProp } from './root-navigator.react';
import {
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
  type ScreenParamList,
  type OverlayParamList,
} from './route-names';
import TabNavigator from './tab-navigator.react';

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
  const storeLoadedFromLocalDatabase = useSelector(state => state.storeLoaded);
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
    if (localSplashScreenHasHidden || !fontsLoaded) {
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

export default AppNavigator;

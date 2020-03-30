// @flow

import type { NavigationStackProp } from 'react-navigation-stack';
import type { NavigationStateRoute } from 'react-navigation';

import * as React from 'react';
import PropTypes from 'prop-types';
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
import { connectNav, type NavContextType } from './navigation-context';
import {
  appLoggedInSelector,
  appCanRespondToBackButtonSelector,
} from './nav-selectors';

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

type WrappedAppNavigatorProps = {|
  navigation: NavigationStackProp<NavigationStateRoute>,
  isForeground: boolean,
  appCanRespondToBackButton: boolean,
|};
class WrappedAppNavigator extends React.PureComponent<WrappedAppNavigatorProps> {
  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    isForeground: PropTypes.bool.isRequired,
    appCanRespondToBackButton: PropTypes.bool.isRequired,
  };

  componentDidMount() {
    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentWillUnmount() {
    if (this.props.isForeground) {
      this.onBackground();
    }
  }

  componentDidUpdate(prevProps: WrappedAppNavigatorProps) {
    if (this.props.isForeground && !prevProps.isForeground) {
      this.onForeground();
    } else if (!this.props.isForeground && prevProps.isForeground) {
      this.onBackground();
    }
  }

  onForeground() {
    BackHandler.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  onBackground() {
    BackHandler.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  hardwareBack = () => {
    if (!this.props.appCanRespondToBackButton) {
      return false;
    }
    this.props.navigation.goBack(null);
    return true;
  };

  render() {
    return (
      <ChatInputStateContainer>
        <OverlayableScrollViewStateContainer>
          <KeyboardStateContainer>
            <AppNavigator navigation={this.props.navigation} />
            <PersistGate persistor={getPersistor()}>
              <PushHandler navigation={this.props.navigation} />
            </PersistGate>
          </KeyboardStateContainer>
        </OverlayableScrollViewStateContainer>
      </ChatInputStateContainer>
    );
  }
}

const ReduxWrappedAppNavigator = connectNav((context: ?NavContextType) => ({
  appCanRespondToBackButton: appCanRespondToBackButtonSelector(context),
  isForeground: appLoggedInSelector(context),
}))(WrappedAppNavigator);
hoistNonReactStatics(ReduxWrappedAppNavigator, AppNavigator);

export default ReduxWrappedAppNavigator;

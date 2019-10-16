// @flow

import type {
  NavigationState,
  NavigationAction,
} from 'react-navigation';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from './redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import { Provider } from 'react-redux';
import {
  AppRegistry,
  Platform,
  UIManager,
  AppState as NativeAppState,
  Linking,
  View,
  StyleSheet,
} from 'react-native';
import { createReduxContainer } from 'react-navigation-redux-helpers';
import PropTypes from 'prop-types';
import SplashScreen from 'react-native-splash-screen';
import Orientation from 'react-native-orientation-locker';

import { connect } from 'lib/utils/redux-utils';
import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';

import { RootNavigator } from './navigation/navigation-setup';
import { handleURLActionType } from './redux/action-types';
import { store, appBecameInactive } from './redux/redux-setup';
import ConnectedStatusBar from './connected-status-bar.react';
import ErrorBoundary from './error-boundary.react';
import DisconnectedBarVisibilityHandler
  from './navigation/disconnected-bar-visibility-handler.react';
import DimensionsUpdater from './redux/dimensions-updater.react';
import ConnectivityUpdater from './redux/connectivity-updater.react';
import PushHandler from './push/push-handler.react';
import ThemeHandler from './themes/theme-handler.react';
import Socket from './socket.react';

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ReduxifiedRootNavigator = createReduxContainer(RootNavigator);
const defaultStatusBarStyle = Platform.OS === "ios"
  ? "dark-content"
  : "default";

type NativeDispatch = Dispatch & ((action: NavigationAction) => boolean);

type Props = {
  // Redux state
  navigationState: NavigationState,
  // Redux dispatch functions
  dispatch: NativeDispatch,
  dispatchActionPayload: DispatchActionPayload,
};
type State = {|
  detectUnsupervisedBackground: ?((alreadyClosed: bool) => bool),
|};
class AppWithNavigationState extends React.PureComponent<Props, State> {

  static propTypes = {
    navigationState: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  state = {
    detectUnsupervisedBackground: null,
  };
  currentState: ?string = NativeAppState.currentState;

  componentDidMount() {
    if (Platform.OS === "android") {
      setTimeout(SplashScreen.hide, 350);
    } else {
      SplashScreen.hide();
    }
    NativeAppState.addEventListener('change', this.handleAppStateChange);
    this.handleInitialURL();
    Linking.addEventListener('url', this.handleURLChange);
    Orientation.lockToPortrait();
  }

  async handleInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      this.dispatchActionForURL(url);
    }
  }

  componentWillUnmount() {
    NativeAppState.removeEventListener('change', this.handleAppStateChange);
    Linking.removeEventListener('url', this.handleURLChange);
  }

  handleURLChange = (event: { url: string }) => {
    this.dispatchActionForURL(event.url);
  }

  dispatchActionForURL(url: string) {
    if (!url.startsWith("http")) {
      return;
    }
    this.props.dispatchActionPayload(handleURLActionType, url);
  }

  handleAppStateChange = (nextState: ?string) => {
    if (!nextState || nextState === "unknown") {
      return;
    }
    const lastState = this.currentState;
    this.currentState = nextState;
    if (lastState === "background" && nextState === "active") {
      this.props.dispatchActionPayload(foregroundActionType, null);
    } else if (lastState !== "background" && nextState === "background") {
      this.props.dispatchActionPayload(backgroundActionType, null);
      appBecameInactive();
    }
  }

  render() {
    const { detectUnsupervisedBackground } = this.state;
    return (
      <View style={styles.app}>
        <Socket
          detectUnsupervisedBackgroundRef={this.detectUnsupervisedBackgroundRef}
        />
        <ReduxifiedRootNavigator
          state={this.props.navigationState}
          dispatch={this.props.dispatch}
        />
        <ConnectedStatusBar barStyle={defaultStatusBarStyle} />
        <DisconnectedBarVisibilityHandler />
        <DimensionsUpdater />
        <ConnectivityUpdater />
        <PushHandler
          detectUnsupervisedBackground={detectUnsupervisedBackground}
        />
        <ThemeHandler />
      </View>
    );
  }

  detectUnsupervisedBackgroundRef = (
    detectUnsupervisedBackground: ?((alreadyClosed: bool) => bool),
  ) => {
    this.setState({ detectUnsupervisedBackground });
  }

}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});

const ConnectedAppWithNavigationState = connect(
  (state: AppState) => ({
    navigationState: state.navInfo.navigationState,
  }),
  null,
  true,
)(AppWithNavigationState);

const App = (props: {}) =>
  <Provider store={store}>
    <ErrorBoundary>
      <ConnectedAppWithNavigationState />
    </ErrorBoundary>
  </Provider>;
AppRegistry.registerComponent('SquadCal', () => App);

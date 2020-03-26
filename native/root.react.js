// @flow

import type { NavigationState, NavigationAction } from 'react-navigation';
import { type GlobalTheme, globalThemePropType } from './types/themes';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from './redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import { Provider } from 'react-redux';
import {
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
import { PersistGate } from 'redux-persist/integration/react';

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
import DisconnectedBarVisibilityHandler from './navigation/disconnected-bar-visibility-handler.react';
import DimensionsUpdater from './redux/dimensions-updater.react';
import ConnectivityUpdater from './redux/connectivity-updater.react';
import PushHandler from './push/push-handler.react';
import ThemeHandler from './themes/theme-handler.react';
import OrientationHandler from './navigation/orientation-handler.react';
import Socket from './socket.react';
import { getPersistor } from './redux/persist';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ReduxifiedRootNavigator = createReduxContainer(RootNavigator);

type NativeDispatch = Dispatch & ((action: NavigationAction) => boolean);

type Props = {
  // Redux state
  navigationState: NavigationState,
  activeTheme: ?GlobalTheme,
  // Redux dispatch functions
  dispatch: NativeDispatch,
  dispatchActionPayload: DispatchActionPayload,
};
type State = {|
  detectUnsupervisedBackground: ?(alreadyClosed: boolean) => boolean,
|};
class Root extends React.PureComponent<Props, State> {
  static propTypes = {
    navigationState: PropTypes.object.isRequired,
    activeTheme: globalThemePropType,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  state = {
    detectUnsupervisedBackground: null,
  };
  currentState: ?string = NativeAppState.currentState;

  componentDidMount() {
    if (Platform.OS === 'android') {
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
  };

  dispatchActionForURL(url: string) {
    if (!url.startsWith('http')) {
      return;
    }
    this.props.dispatchActionPayload(handleURLActionType, url);
  }

  handleAppStateChange = (nextState: ?string) => {
    if (!nextState || nextState === 'unknown') {
      return;
    }
    const lastState = this.currentState;
    this.currentState = nextState;
    if (lastState === 'background' && nextState === 'active') {
      this.props.dispatchActionPayload(foregroundActionType, null);
    } else if (lastState !== 'background' && nextState === 'background') {
      this.props.dispatchActionPayload(backgroundActionType, null);
      appBecameInactive();
    }
  };

  render() {
    const { detectUnsupervisedBackground } = this.state;
    const { detectUnsupervisedBackgroundRef } = this;
    const reactNavigationTheme = this.props.activeTheme
      ? this.props.activeTheme
      : 'no-preference';
    const gated: React.Node = (
      <>
        <Socket
          detectUnsupervisedBackgroundRef={detectUnsupervisedBackgroundRef}
        />
        <DisconnectedBarVisibilityHandler />
        <DimensionsUpdater />
        <ConnectivityUpdater />
        <PushHandler
          detectUnsupervisedBackground={detectUnsupervisedBackground}
        />
        <ThemeHandler />
        <OrientationHandler />
      </>
    );
    return (
      <View style={styles.app}>
        <ConnectedStatusBar />
        <PersistGate persistor={getPersistor()}>{gated}</PersistGate>
        <ReduxifiedRootNavigator
          state={this.props.navigationState}
          dispatch={this.props.dispatch}
          theme={reactNavigationTheme}
        />
      </View>
    );
  }

  detectUnsupervisedBackgroundRef = (
    detectUnsupervisedBackground: ?(alreadyClosed: boolean) => boolean,
  ) => {
    this.setState({ detectUnsupervisedBackground });
  };
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});

const ConnectedRoot = connect(
  (state: AppState) => ({
    navigationState: state.navInfo.navigationState,
    activeTheme: state.globalThemeInfo.activeTheme,
  }),
  null,
  true,
)(Root);

const AppRoot = () => (
  <Provider store={store}>
    <ErrorBoundary>
      <ConnectedRoot />
    </ErrorBoundary>
  </Provider>
);
export default AppRoot;

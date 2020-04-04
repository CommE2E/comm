// @flow

import { type GlobalTheme, globalThemePropType } from './types/themes';
import type { AppState } from './redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { NavAction } from './navigation/navigation-context';

import * as React from 'react';
import { Provider } from 'react-redux';
import {
  Platform,
  UIManager,
  AppState as NativeAppState,
  View,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import Orientation from 'react-native-orientation-locker';
import { PersistGate } from 'redux-persist/integration/react';
import {
  type SupportedThemes,
  type NavigationState,
  createAppContainer,
  NavigationActions,
} from 'react-navigation';

import { connect } from 'lib/utils/redux-utils';
import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';
import { actionLogger } from 'lib/utils/action-logger';

import RootNavigator from './navigation/root-navigator.react';
import { store, appBecameInactive } from './redux/redux-setup';
import ConnectedStatusBar from './connected-status-bar.react';
import ErrorBoundary from './error-boundary.react';
import DisconnectedBarVisibilityHandler from './navigation/disconnected-bar-visibility-handler.react';
import DimensionsUpdater from './redux/dimensions-updater.react';
import ConnectivityUpdater from './redux/connectivity-updater.react';
import ThemeHandler from './themes/theme-handler.react';
import OrientationHandler from './navigation/orientation-handler.react';
import Socket from './socket.react';
import { getPersistor } from './redux/persist';
import {
  NavContext,
  type NavContextType,
} from './navigation/navigation-context';
import { setGlobalNavContext } from './navigation/icky-global';
import { RootContext, type RootContextType } from './root-context';
import NavigationHandler from './navigation/navigation-handler.react';
import { defaultNavigationState } from './navigation/default-state';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavContainer = React.AbstractComponent<
  {|
    theme?: SupportedThemes | 'no-preference',
    loadNavigationState?: () => Promise<NavigationState>,
    onNavigationStateChange?: (
      prevState: NavigationState,
      state: NavigationState,
      action: NavAction,
    ) => void,
  |},
  {
    dispatch: (action: NavAction) => boolean,
  },
>;
const NavAppContainer: NavContainer = (createAppContainer(RootNavigator): any);

type Props = {
  // Redux state
  activeTheme: ?GlobalTheme,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
type State = {|
  navContext: ?NavContextType,
  rootContext: RootContextType,
|};
class Root extends React.PureComponent<Props, State> {
  static propTypes = {
    activeTheme: globalThemePropType,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  currentAppState: ?string = NativeAppState.currentState;

  navDispatch: ?(action: NavAction) => boolean;
  navState: ?NavigationState;
  navStateInitialized = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      navContext: null,
      rootContext: { setNavStateInitialized: this.setNavStateInitialized },
    };
  }

  componentDidMount() {
    NativeAppState.addEventListener('change', this.handleAppStateChange);
    Orientation.lockToPortrait();
  }

  componentWillUnmount() {
    NativeAppState.removeEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextState: ?string) => {
    if (!nextState || nextState === 'unknown') {
      return;
    }
    const lastState = this.currentAppState;
    this.currentAppState = nextState;
    if (lastState === 'background' && nextState === 'active') {
      this.props.dispatchActionPayload(foregroundActionType, null);
    } else if (lastState !== 'background' && nextState === 'background') {
      this.props.dispatchActionPayload(backgroundActionType, null);
      appBecameInactive();
    }
  };

  render() {
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
        <ThemeHandler />
        <OrientationHandler />
      </>
    );
    return (
      <View style={styles.app}>
        <NavContext.Provider value={this.state.navContext}>
          <RootContext.Provider value={this.state.rootContext}>
            <ConnectedStatusBar />
            <PersistGate persistor={getPersistor()}>{gated}</PersistGate>
            <NavAppContainer
              theme={reactNavigationTheme}
              loadNavigationState={this.loadNavigationState}
              onNavigationStateChange={this.onNavigationStateChange}
              ref={this.appContainerRef}
            />
            <NavigationHandler />
          </RootContext.Provider>
        </NavContext.Provider>
      </View>
    );
  }

  detectUnsupervisedBackgroundRef = (
    detectUnsupervisedBackground: ?(alreadyClosed: boolean) => boolean,
  ) => {
    this.setState(prevState => ({
      rootContext: {
        ...prevState.rootContext,
        detectUnsupervisedBackground,
      },
    }));
  };

  loadNavigationState = async () => {
    this.navState = defaultNavigationState;
    this.setNavContext();
    actionLogger.addOtherAction(
      'navState',
      NavigationActions.init(),
      null,
      this.navState,
    );
    return defaultNavigationState;
  };

  onNavigationStateChange = (
    prevState: NavigationState,
    state: NavigationState,
    action: NavAction,
  ) => {
    this.navState = state;
    this.setNavContext();
    actionLogger.addOtherAction('navState', action, prevState, state);
  };

  appContainerRef = (appContainer: ?React.ElementRef<NavContainer>) => {
    if (!appContainer) {
      return;
    }
    this.navDispatch = appContainer.dispatch;
    this.setNavContext();
  };

  setNavContext() {
    if (!this.navState || !this.navDispatch || !this.navStateInitialized) {
      return;
    }
    const navContext = {
      state: this.navState,
      dispatch: this.navDispatch,
    };
    this.setState({ navContext });
    setGlobalNavContext(navContext);
  }

  setNavStateInitialized = () => {
    this.navStateInitialized = true;
    this.setNavContext();
  };
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});

const ConnectedRoot = connect(
  (state: AppState) => ({
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

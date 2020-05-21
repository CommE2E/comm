// @flow

import { type GlobalTheme, globalThemePropType } from './types/themes';
import type { AppState } from './redux/redux-setup';
import type { NavAction } from './navigation/navigation-context';
import type { NavigationState } from '@react-navigation/native';
import type { NavigationAction } from 'react-navigation';

import * as React from 'react';
import { Provider } from 'react-redux';
import { Platform, UIManager, View, StyleSheet } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { PersistGate } from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-community/async-storage';
import {
  NavigationContainer,
  CommonActions,
} from '@react-navigation/native';
import invariant from 'invariant';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { connect } from 'lib/utils/redux-utils';
import { actionLogger } from 'lib/utils/action-logger';

import RootNavigator from './navigation/root-navigator.react';
import { store } from './redux/redux-setup';
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
import InputStateContainer from './input/input-state-container.react';
import './themes/fonts';
import LifecycleHandler from './lifecycle/lifecycle-handler.react';
import { DarkTheme, LightTheme } from './themes/navigation';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const navStateAsyncStorageKey = 'navState';

type Props = {
  // Redux state
  activeTheme: ?GlobalTheme,
};
type State = {|
  navContext: ?NavContextType,
  rootContext: RootContextType,
  initialState: ?NavigationState,
|};
class Root extends React.PureComponent<Props, State> {
  static propTypes = {
    activeTheme: globalThemePropType,
  };
  navDispatch: ?(action: NavAction) => boolean;
  navState: ?NavigationState;
  navStateInitialized = false;
  queuedActions = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      navContext: null,
      rootContext: {
        setNavStateInitialized: this.setNavStateInitialized,
        onNavAction: this.onNavAction,
      },
      initialState: null,
    };
  }

  componentDidMount() {
    Orientation.lockToPortrait();
    this.loadInitialState();
  }

  async loadInitialState() {
    let initialState;
    if (__DEV__) {
      try {
        const navStateString = await AsyncStorage.getItem(
          navStateAsyncStorageKey,
        );
        if (navStateString) {
          initialState = JSON.parse(navStateString);
        }
      } catch {}
    }
    if (!initialState) {
      initialState = defaultNavigationState;
    }
    this.navState = initialState;
    this.setNavContext();
    actionLogger.addOtherAction(
      'navState',
      'NAV/@@INIT',
      null,
      initialState,
    );
    this.setState({ initialState });
  };

  get theme() {
    const { activeTheme } = this.props;
    if (activeTheme === 'light') {
      return LightTheme;
    } else if (activeTheme === 'dark') {
      return DarkTheme;
    }
    return undefined;
  }

  render() {
    const { detectUnsupervisedBackgroundRef } = this;
    const gated: React.Node = (
      <>
        <LifecycleHandler />
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
    let navContainer;
    if (this.state.initialState) {
      navContainer = (
        <NavigationContainer
          initialState={this.state.initialState}
          onStateChange={this.onNavigationStateChange}
          theme={this.theme}
          ref={this.navContainerRef}
        >
          <RootNavigator />
        </NavigationContainer>
      );
    }
    return (
      <View style={styles.app}>
        <NavContext.Provider value={this.state.navContext}>
          <RootContext.Provider value={this.state.rootContext}>
            <InputStateContainer>
              <SafeAreaProvider>
                <ConnectedStatusBar />
                <PersistGate persistor={getPersistor()}>{gated}</PersistGate>
                {navContainer}
                <NavigationHandler />
              </SafeAreaProvider>
            </InputStateContainer>
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

  onNavigationStateChange = (state: ?NavigationState) => {
    invariant(state, 'nav state should be non-null');
    const prevState = this.navState;
    this.navState = state;
    this.setNavContext();

    const { queuedActions } = this;
    this.queuedActions = [];
    if (queuedActions.length === 0) {
      queuedActions.push('NAV/@@UNKNOWN');
    }
    for (let action of queuedActions) {
      actionLogger.addOtherAction('navState', action, prevState, state);
    }

    if (__DEV__) {
      this.persistNavigationState(state);
    }
  };

  navContainerRef = (navContainer: ?React.ElementRef<NavigationContainer>) => {
    if (!navContainer) {
      return;
    }
    if (!this.navDispatch) {
      this.navDispatch = navContainer.dispatch;
      this.setNavContext();
    }
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

  onNavAction = (action: NavigationAction | string) => {
    if (typeof action === 'string') {
      this.queuedActions.push(`NAV/${action}`);
    } else if (
      action &&
      typeof action === 'object' &&
      typeof action.type === 'string'
    ) {
      this.queuedActions.push({
        ...action,
        type: `NAV/${action.type}`,
      });
    } else {
      this.queuedActions.push(action);
    }
  };

  persistNavigationState = async (state: NavigationState) => {
    try {
      await AsyncStorage.setItem(
        navStateAsyncStorageKey,
        JSON.stringify(state),
      );
    } catch (e) {
      console.log('AsyncStorage threw while trying to persist navState', e);
    }
  };
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});

const ConnectedRoot = connect((state: AppState) => ({
  activeTheme: state.globalThemeInfo.activeTheme,
}))(Root);

const AppRoot = () => (
  <Provider store={store}>
    <ErrorBoundary>
      <ConnectedRoot />
    </ErrorBoundary>
  </Provider>
);
export default AppRoot;

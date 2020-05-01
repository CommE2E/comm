// @flow

import { type GlobalTheme, globalThemePropType } from './types/themes';
import type { AppState } from './redux/redux-setup';
import type { NavAction } from './navigation/navigation-context';

import * as React from 'react';
import { Provider } from 'react-redux';
import { Platform, UIManager, View, StyleSheet } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { PersistGate } from 'redux-persist/integration/react';
import {
  type SupportedThemes,
  type NavigationState,
  createAppContainer,
  NavigationActions,
} from 'react-navigation';
import AsyncStorage from '@react-native-community/async-storage';

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
    persistNavigationState?: (state: NavigationState) => Promise<void>,
  |},
  {
    dispatch: (action: NavAction) => boolean,
  },
>;
const NavAppContainer: NavContainer = (createAppContainer(RootNavigator): any);

const navStateAsyncStorageKey = 'navState';

type Props = {
  // Redux state
  activeTheme: ?GlobalTheme,
};
type State = {|
  navContext: ?NavContextType,
  rootContext: RootContextType,
|};
class Root extends React.PureComponent<Props, State> {
  static propTypes = {
    activeTheme: globalThemePropType,
  };

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
    Orientation.lockToPortrait();
  }

  render() {
    const { detectUnsupervisedBackgroundRef } = this;
    const reactNavigationTheme = this.props.activeTheme
      ? this.props.activeTheme
      : 'no-preference';
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
    const persistNavigationState = __DEV__
      ? this.persistNavigationState
      : undefined;
    return (
      <View style={styles.app}>
        <NavContext.Provider value={this.state.navContext}>
          <RootContext.Provider value={this.state.rootContext}>
            <InputStateContainer>
              <ConnectedStatusBar />
              <PersistGate persistor={getPersistor()}>{gated}</PersistGate>
              <NavAppContainer
                theme={reactNavigationTheme}
                loadNavigationState={this.loadNavigationState}
                onNavigationStateChange={this.onNavigationStateChange}
                persistNavigationState={persistNavigationState}
                ref={this.appContainerRef}
              />
              <NavigationHandler />
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

  loadNavigationState = async () => {
    let navState;
    if (__DEV__) {
      const navStateString = await AsyncStorage.getItem(
        navStateAsyncStorageKey,
      );
      if (navStateString) {
        try {
          navState = JSON.parse(navStateString);
        } catch (e) {
          console.log('JSON.parse threw while trying to dehydrate navState', e);
        }
      }
    }
    if (!navState) {
      navState = defaultNavigationState;
    }
    this.navState = navState;
    this.setNavContext();
    actionLogger.addOtherAction(
      'navState',
      NavigationActions.init(),
      null,
      navState,
    );
    return navState;
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

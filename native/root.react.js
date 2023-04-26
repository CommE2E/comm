// @flow

import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReduxDevToolsExtension } from '@react-navigation/devtools';
import { NavigationContainer } from '@react-navigation/native';
import type { PossiblyStaleNavigationState } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import invariant from 'invariant';
import * as React from 'react';
import { Platform, UIManager, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate as ReduxPersistGate } from 'redux-persist/es/integration/react.js';

import { ENSCacheProvider } from 'lib/components/ens-cache-provider.react.js';
import { MediaCacheProvider } from 'lib/components/media-cache-provider.react.js';
import { actionLogger } from 'lib/utils/action-logger.js';

import ChatContextProvider from './chat/chat-context-provider.react.js';
import { FeatureFlagsProvider } from './components/feature-flags-provider.react.js';
import PersistedStateGate from './components/persisted-state-gate.js';
import ConnectedStatusBar from './connected-status-bar.react.js';
import { SQLiteDataHandler } from './data/sqlite-data-handler.js';
import ErrorBoundary from './error-boundary.react.js';
import InputStateContainer from './input/input-state-container.react.js';
import LifecycleHandler from './lifecycle/lifecycle-handler.react.js';
import MarkdownContextProvider from './markdown/markdown-context-provider.react.js';
import { filesystemMediaCache } from './media/media-cache.js';
import { defaultNavigationState } from './navigation/default-state.js';
import DisconnectedBarVisibilityHandler from './navigation/disconnected-bar-visibility-handler.react.js';
import { setGlobalNavContext } from './navigation/icky-global.js';
import { NavContext } from './navigation/navigation-context.js';
import NavigationHandler from './navigation/navigation-handler.react.js';
import { validNavState } from './navigation/navigation-utils.js';
import OrientationHandler from './navigation/orientation-handler.react.js';
import { navStateAsyncStorageKey } from './navigation/persistance.js';
import RootNavigator from './navigation/root-navigator.react.js';
import ConnectivityUpdater from './redux/connectivity-updater.react.js';
import { DimensionsUpdater } from './redux/dimensions-updater.react.js';
import { getPersistor } from './redux/persist.js';
import { store } from './redux/redux-setup.js';
import { useSelector } from './redux/redux-utils.js';
import { RootContext } from './root-context.js';
import Socket from './socket.react.js';
import { StaffContextProvider } from './staff/staff-context.provider.react.js';
import { useLoadCommFonts } from './themes/fonts.js';
import { DarkTheme, LightTheme } from './themes/navigation.js';
import ThemeHandler from './themes/theme-handler.react.js';
import { provider } from './utils/ethers-utils.js';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const navInitAction = Object.freeze({ type: 'NAV/@@INIT' });
const navUnknownAction = Object.freeze({ type: 'NAV/@@UNKNOWN' });

SplashScreen.preventAutoHideAsync().catch(console.log);

function Root() {
  const navStateRef = React.useRef();
  const navDispatchRef = React.useRef();
  const navStateInitializedRef = React.useRef(false);

  // We call this here to start the loading process
  // We gate the UI on the fonts loading in AppNavigator
  useLoadCommFonts();

  const [navContext, setNavContext] = React.useState(null);
  const updateNavContext = React.useCallback(() => {
    if (
      !navStateRef.current ||
      !navDispatchRef.current ||
      !navStateInitializedRef.current
    ) {
      return;
    }
    const updatedNavContext = {
      state: navStateRef.current,
      dispatch: navDispatchRef.current,
    };
    setNavContext(updatedNavContext);
    setGlobalNavContext(updatedNavContext);
  }, []);

  const [initialState, setInitialState] = React.useState(
    __DEV__ ? undefined : defaultNavigationState,
  );

  React.useEffect(() => {
    Orientation.lockToPortrait();
    (async () => {
      let loadedState = initialState;
      if (__DEV__) {
        try {
          const navStateString = await AsyncStorage.getItem(
            navStateAsyncStorageKey,
          );
          if (navStateString) {
            const savedState = JSON.parse(navStateString);
            if (validNavState(savedState)) {
              loadedState = savedState;
            }
          }
        } catch {}
      }
      if (!loadedState) {
        loadedState = defaultNavigationState;
      }
      if (loadedState !== initialState) {
        setInitialState(loadedState);
      }
      navStateRef.current = loadedState;
      updateNavContext();
      actionLogger.addOtherAction('navState', navInitAction, null, loadedState);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateNavContext]);

  const setNavStateInitialized = React.useCallback(() => {
    navStateInitializedRef.current = true;
    updateNavContext();
  }, [updateNavContext]);

  const [rootContext, setRootContext] = React.useState(() => ({
    setNavStateInitialized,
  }));

  const detectUnsupervisedBackgroundRef = React.useCallback(
    (detectUnsupervisedBackground: ?(alreadyClosed: boolean) => boolean) => {
      setRootContext(prevRootContext => ({
        ...prevRootContext,
        detectUnsupervisedBackground,
      }));
    },
    [],
  );

  const frozen = useSelector(state => state.frozen);
  const queuedActionsRef = React.useRef([]);
  const onNavigationStateChange = React.useCallback(
    (state: ?PossiblyStaleNavigationState) => {
      invariant(state, 'nav state should be non-null');
      const prevState = navStateRef.current;
      navStateRef.current = state;
      updateNavContext();

      const queuedActions = queuedActionsRef.current;
      queuedActionsRef.current = [];
      if (queuedActions.length === 0) {
        queuedActions.push(navUnknownAction);
      }
      for (const action of queuedActions) {
        actionLogger.addOtherAction('navState', action, prevState, state);
      }

      if (!__DEV__ || frozen) {
        return;
      }

      (async () => {
        try {
          await AsyncStorage.setItem(
            navStateAsyncStorageKey,
            JSON.stringify(state),
          );
        } catch (e) {
          console.log('AsyncStorage threw while trying to persist navState', e);
        }
      })();
    },
    [updateNavContext, frozen],
  );

  const navContainerRef = React.useRef();
  const containerRef = React.useCallback(
    (navContainer: ?React.ElementRef<typeof NavigationContainer>) => {
      navContainerRef.current = navContainer;
      if (navContainer && !navDispatchRef.current) {
        navDispatchRef.current = navContainer.dispatch;
        updateNavContext();
      }
    },
    [updateNavContext],
  );
  useReduxDevToolsExtension(navContainerRef);

  const navContainer = navContainerRef.current;
  React.useEffect(() => {
    if (!navContainer) {
      return undefined;
    }
    return navContainer.addListener('__unsafe_action__', event => {
      const { action, noop } = event.data;
      const navState = navStateRef.current;
      if (noop) {
        actionLogger.addOtherAction('navState', action, navState, navState);
        return;
      }
      queuedActionsRef.current.push({
        ...action,
        type: `NAV/${action.type}`,
      });
    });
  }, [navContainer]);

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const theme = (() => {
    if (activeTheme === 'light') {
      return LightTheme;
    } else if (activeTheme === 'dark') {
      return DarkTheme;
    }
    return undefined;
  })();

  const gated: React.Node = (
    <>
      <LifecycleHandler />
      <DisconnectedBarVisibilityHandler />
      <DimensionsUpdater />
      <ConnectivityUpdater />
      <ThemeHandler />
      <OrientationHandler />
    </>
  );
  let navigation;
  if (initialState) {
    navigation = (
      <NavigationContainer
        initialState={initialState}
        onStateChange={onNavigationStateChange}
        theme={theme}
        ref={containerRef}
      >
        <RootNavigator />
        <NavigationHandler />
      </NavigationContainer>
    );
  }
  return (
    <GestureHandlerRootView style={styles.app}>
      <StaffContextProvider>
        <FeatureFlagsProvider>
          <NavContext.Provider value={navContext}>
            <RootContext.Provider value={rootContext}>
              <InputStateContainer>
                <SafeAreaProvider initialMetrics={initialWindowMetrics}>
                  <ActionSheetProvider>
                    <ENSCacheProvider provider={provider}>
                      <MediaCacheProvider persistence={filesystemMediaCache}>
                        <MarkdownContextProvider>
                          <ChatContextProvider>
                            <SQLiteDataHandler />
                            <ConnectedStatusBar />
                            <ReduxPersistGate persistor={getPersistor()}>
                              {gated}
                            </ReduxPersistGate>
                            <PersistedStateGate>
                              <Socket
                                detectUnsupervisedBackgroundRef={
                                  detectUnsupervisedBackgroundRef
                                }
                              />
                            </PersistedStateGate>
                            {navigation}
                          </ChatContextProvider>
                        </MarkdownContextProvider>
                      </MediaCacheProvider>
                    </ENSCacheProvider>
                  </ActionSheetProvider>
                </SafeAreaProvider>
              </InputStateContainer>
            </RootContext.Provider>
          </NavContext.Provider>
        </FeatureFlagsProvider>
      </StaffContextProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});

function AppRoot(): React.Node {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>
    </Provider>
  );
}
export default AppRoot;

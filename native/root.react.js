// @flow

import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PossiblyStaleNavigationState,
  UnsafeContainerActionEvent,
  GenericNavigationAction,
} from '@react-navigation/core';
import { useReduxDevToolsExtension } from '@react-navigation/devtools';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate as ReduxPersistGate } from 'redux-persist/es/integration/react.js';

import { ChatMentionContextProvider } from 'lib/components/chat-mention-provider.react.js';
import { EditUserAvatarProvider } from 'lib/components/edit-user-avatar-provider.react.js';
import { ENSCacheProvider } from 'lib/components/ens-cache-provider.react.js';
import { FarcasterChannelPrefetchHandler } from 'lib/components/farcaster-channel-prefetch-handler.react.js';
import { FarcasterDataHandler } from 'lib/components/farcaster-data-handler.react.js';
import { GlobalSearchIndexProvider } from 'lib/components/global-search-index-provider.react.js';
import IntegrityHandler from 'lib/components/integrity-handler.react.js';
import { MediaCacheProvider } from 'lib/components/media-cache-provider.react.js';
import { NeynarClientProvider } from 'lib/components/neynar-client-provider.react.js';
import PlatformDetailsSynchronizer from 'lib/components/platform-details-synchronizer.react.js';
import PrekeysHandler from 'lib/components/prekeys-handler.react.js';
import { QRAuthProvider } from 'lib/components/qr-auth-provider.react.js';
import { StaffContextProvider } from 'lib/components/staff-provider.react.js';
import SyncCommunityStoreHandler from 'lib/components/sync-community-store-handler.react.js';
import { UserIdentityCacheProvider } from 'lib/components/user-identity-cache.react.js';
import { DBOpsHandler } from 'lib/handlers/db-ops-handler.react.js';
import { HoldersHandler } from 'lib/handlers/holders-handler.react.js';
import { InitialStateSharingHandler } from 'lib/handlers/initial-state-sharing-handler.react.js';
import { TunnelbrokerDeviceTokenHandler } from 'lib/handlers/tunnelbroker-device-token-handler.react.js';
import { UserInfosHandler } from 'lib/handlers/user-infos-handler.react.js';
import { IdentitySearchProvider } from 'lib/identity-search/identity-search-context.js';
import { CallKeyserverEndpointProvider } from 'lib/keyserver-conn/call-keyserver-endpoint-provider.react.js';
import KeyserverConnectionsHandler from 'lib/keyserver-conn/keyserver-connections-handler.js';
import { TunnelbrokerProvider } from 'lib/tunnelbroker/tunnelbroker-context.js';
import { actionLogger } from 'lib/utils/action-logger.js';

import { RegistrationContextProvider } from './account/registration/registration-context-provider.react.js';
import NativeEditThreadAvatarProvider from './avatars/native-edit-thread-avatar-provider.react.js';
import BackupHandler from './backup/backup-handler.js';
import { BottomSheetProvider } from './bottom-sheet/bottom-sheet-provider.react.js';
import ChatContextProvider from './chat/chat-context-provider.react.js';
import MessageEditingContextProvider from './chat/message-editing-context-provider.react.js';
import AccessTokenHandler from './components/access-token-handler.react.js';
import { AutoJoinCommunityHandler } from './components/auto-join-community-handler.react.js';
import BackgroundIdentityLoginHandler from './components/background-identity-login-handler.react.js';
import ConnectFarcasterAlertHandler from './components/connect-farcaster-alert-handler.react.js';
import DMActivityHandler from './components/dm-activity-handler.react.js';
import { FeatureFlagsProvider } from './components/feature-flags-provider.react.js';
import { NUXTipsContextProvider } from './components/nux-tips-context.react.js';
import PersistedStateGate from './components/persisted-state-gate.js';
import ReportHandler from './components/report-handler.react.js';
import VersionSupportedChecker from './components/version-supported.react.js';
import ConnectedStatusBar from './connected-status-bar.react.js';
import { SQLiteDataHandler } from './data/sqlite-data-handler.js';
import ErrorBoundary from './error-boundary.react.js';
import IdentityServiceContextProvider from './identity-service/identity-service-context-provider.react.js';
import InputStateContainer from './input/input-state-container.react.js';
import LifecycleHandler from './lifecycle/lifecycle-handler.react.js';
import MarkdownContextProvider from './markdown/markdown-context-provider.react.js';
import { filesystemMediaCache } from './media/media-cache.js';
import { DeepLinksContextProvider } from './navigation/deep-links-context-provider.react.js';
import { defaultNavigationState } from './navigation/default-state.js';
import { setGlobalNavContext } from './navigation/icky-global.js';
import KeyserverReachabilityHandler from './navigation/keyserver-reachability-handler.js';
import {
  NavContext,
  type NavContextType,
} from './navigation/navigation-context.js';
import NavigationHandler from './navigation/navigation-handler.react.js';
import {
  validNavState,
  isShowingNUXTips,
} from './navigation/navigation-utils.js';
import OrientationHandler from './navigation/orientation-handler.react.js';
import { navStateAsyncStorageKey } from './navigation/persistance.js';
import RootNavigator from './navigation/root-navigator.react.js';
import ConnectivityUpdater from './redux/connectivity-updater.react.js';
import { DimensionsUpdater } from './redux/dimensions-updater.react.js';
import { getPersistor } from './redux/persist.js';
import { store } from './redux/redux-setup.js';
import { useSelector } from './redux/redux-utils.js';
import { RootContext } from './root-context.js';
import { MessageSearchProvider } from './search/search-provider.react.js';
import Socket from './socket.react.js';
import { useLoadCommFonts } from './themes/fonts.js';
import { DarkTheme, LightTheme } from './themes/navigation.js';
import ThemeHandler from './themes/theme-handler.react.js';
import { alchemyKey, ethersProvider } from './utils/ethers-utils.js';
import { neynarKey } from './utils/neynar-utils.js';
import {
  composeTunnelbrokerQRAuthMessage,
  handleSecondaryDeviceLogInError,
  parseTunnelbrokerQRAuthMessage,
  performBackupRestore,
  generateQRAuthAESKey,
} from './utils/qr-code-utils.js';

// Add custom items to expo-dev-menu
import './dev-menu.js';
import './types/message-types-validator.js';

const navInitAction = Object.freeze({ type: 'NAV/@@INIT' });
const navUnknownAction = Object.freeze({ type: 'NAV/@@UNKNOWN' });

SplashScreen.preventAutoHideAsync().catch(console.log);

function Root() {
  const navStateRef = React.useRef<?PossiblyStaleNavigationState>();
  const navDispatchRef =
    React.useRef<?(
      action:
        | GenericNavigationAction
        | (PossiblyStaleNavigationState => GenericNavigationAction),
    ) => void>();
  const navStateInitializedRef = React.useRef(false);

  // We call this here to start the loading process
  // We gate the UI on the fonts loading in AppNavigator
  useLoadCommFonts();

  const [navContext, setNavContext] = React.useState<?NavContextType>(null);
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
    void (async () => {
      let loadedState = initialState;
      if (__DEV__) {
        try {
          const navStateString = await AsyncStorage.getItem(
            navStateAsyncStorageKey,
          );
          if (navStateString) {
            const savedState = JSON.parse(navStateString);
            if (validNavState(savedState) && !isShowingNUXTips(savedState)) {
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
  const queuedActionsRef = React.useRef<Array<GenericNavigationAction>>([]);
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

      void (async () => {
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

  const navContainerRef =
    React.useRef<?React.ElementRef<typeof NavigationContainer>>();
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
    return navContainer.addListener(
      '__unsafe_action__',
      (event: { +data: UnsafeContainerActionEvent, ... }) => {
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
      },
    );
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
      <KeyserverReachabilityHandler />
      <DimensionsUpdater />
      <ConnectivityUpdater />
      <ThemeHandler />
      <OrientationHandler />
      <BackupHandler />
      <IntegrityHandler />
      <AccessTokenHandler />
      <DBOpsHandler />
      <UserInfosHandler />
      <TunnelbrokerDeviceTokenHandler />
      <HoldersHandler />
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
        <BottomSheetModalProvider>
          <ChatContextProvider>
            <DeepLinksContextProvider>
              <ChatMentionContextProvider>
                <GlobalSearchIndexProvider>
                  <NUXTipsContextProvider>
                    <RootNavigator />
                  </NUXTipsContextProvider>
                </GlobalSearchIndexProvider>
              </ChatMentionContextProvider>
            </DeepLinksContextProvider>
          </ChatContextProvider>
          <NavigationHandler />
          <PersistedStateGate>
            <FarcasterDataHandler>
              <ConnectFarcasterAlertHandler />
            </FarcasterDataHandler>
          </PersistedStateGate>
        </BottomSheetModalProvider>
      </NavigationContainer>
    );
  }
  return (
    <GestureHandlerRootView style={styles.app}>
      <StaffContextProvider>
        <IdentityServiceContextProvider>
          <UserIdentityCacheProvider>
            <ENSCacheProvider
              ethersProvider={ethersProvider}
              alchemyKey={alchemyKey}
            >
              <NeynarClientProvider apiKey={neynarKey}>
                <TunnelbrokerProvider>
                  <IdentitySearchProvider>
                    <QRAuthProvider
                      parseTunnelbrokerQRAuthMessage={
                        parseTunnelbrokerQRAuthMessage
                      }
                      composeTunnelbrokerQRAuthMessage={
                        composeTunnelbrokerQRAuthMessage
                      }
                      generateAESKey={generateQRAuthAESKey}
                      performBackupRestore={performBackupRestore}
                      onLogInError={handleSecondaryDeviceLogInError}
                    >
                      <FeatureFlagsProvider>
                        <NavContext.Provider value={navContext}>
                          <RootContext.Provider value={rootContext}>
                            <InputStateContainer>
                              <MessageEditingContextProvider>
                                <SafeAreaProvider
                                  initialMetrics={initialWindowMetrics}
                                >
                                  <ActionSheetProvider>
                                    <MediaCacheProvider
                                      persistence={filesystemMediaCache}
                                    >
                                      <EditUserAvatarProvider>
                                        <NativeEditThreadAvatarProvider>
                                          <MarkdownContextProvider>
                                            <MessageSearchProvider>
                                              <BottomSheetProvider>
                                                <RegistrationContextProvider>
                                                  <SQLiteDataHandler />
                                                  <ConnectedStatusBar />
                                                  <ReduxPersistGate
                                                    persistor={getPersistor()}
                                                  >
                                                    {gated}
                                                  </ReduxPersistGate>
                                                  <PersistedStateGate>
                                                    <KeyserverConnectionsHandler
                                                      socketComponent={Socket}
                                                      detectUnsupervisedBackgroundRef={
                                                        detectUnsupervisedBackgroundRef
                                                      }
                                                    />
                                                    <DMActivityHandler />
                                                    <VersionSupportedChecker />
                                                    <PlatformDetailsSynchronizer />
                                                    <BackgroundIdentityLoginHandler />
                                                    <PrekeysHandler />
                                                    <ReportHandler />
                                                    <FarcasterChannelPrefetchHandler />
                                                    <AutoJoinCommunityHandler />
                                                    <SyncCommunityStoreHandler />
                                                    <InitialStateSharingHandler />
                                                  </PersistedStateGate>
                                                  {navigation}
                                                </RegistrationContextProvider>
                                              </BottomSheetProvider>
                                            </MessageSearchProvider>
                                          </MarkdownContextProvider>
                                        </NativeEditThreadAvatarProvider>
                                      </EditUserAvatarProvider>
                                    </MediaCacheProvider>
                                  </ActionSheetProvider>
                                </SafeAreaProvider>
                              </MessageEditingContextProvider>
                            </InputStateContainer>
                          </RootContext.Provider>
                        </NavContext.Provider>
                      </FeatureFlagsProvider>
                    </QRAuthProvider>
                  </IdentitySearchProvider>
                </TunnelbrokerProvider>
              </NeynarClientProvider>
            </ENSCacheProvider>
          </UserIdentityCacheProvider>
        </IdentityServiceContextProvider>
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
      <CallKeyserverEndpointProvider>
        <ErrorBoundary>
          <Root />
        </ErrorBoundary>
      </CallKeyserverEndpointProvider>
    </Provider>
  );
}

export default AppRoot;

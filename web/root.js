// @flow

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import localforage from 'localforage';
import * as React from 'react';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router';
import { createStore, applyMiddleware, type Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/logOnlyInProduction.js';
import { persistReducer, persistStore } from 'redux-persist';
import thunk from 'redux-thunk';
import { WagmiProvider } from 'wagmi';

import IntegrityHandler from 'lib/components/integrity-handler.react.js';
import PrekeysHandler from 'lib/components/prekeys-handler.react.js';
import ReportHandler from 'lib/components/report-handler.react.js';
import { CallKeyserverEndpointProvider } from 'lib/keyserver-conn/call-keyserver-endpoint-provider.react.js';
import KeyserverConnectionsHandler from 'lib/keyserver-conn/keyserver-connections-handler.js';
import { reduxLoggerMiddleware } from 'lib/utils/action-logger.js';
import { getWagmiConfig } from 'lib/utils/wagmi-utils.js';

import App from './app.react.js';
import ErrorBoundary from './error-boundary.react.js';
import IdentityServiceContextProvider from './grpc/identity-service-context-provider.react.js';
import { defaultWebState } from './redux/default-state.js';
import InitialReduxStateGate from './redux/initial-state-gate.js';
import { persistConfig } from './redux/persist.js';
import { type AppState, type Action, reducer } from './redux/redux-setup.js';
import {
  synchronizeStoreWithOtherTabs,
  tabSynchronizationMiddleware,
} from './redux/tab-synchronization.js';
import history from './router-history.js';
import { SQLiteDataHandler } from './shared-worker/sqlite-data-handler.js';
import { localforageConfig } from './shared-worker/utils/constants.js';
import Socket from './socket.react.js';

localforage.config(localforageConfig);

const persistedReducer = persistReducer(persistConfig, reducer);
const store: Store<AppState, Action> = createStore(
  persistedReducer,
  defaultWebState,
  composeWithDevTools({
    maxAge: 200,
  })(
    applyMiddleware(thunk, reduxLoggerMiddleware, tabSynchronizationMiddleware),
  ),
);
synchronizeStoreWithOtherTabs(store);
const persistor = persistStore(store);

const queryClient = new QueryClient();

const wagmiConfig = getWagmiConfig([
  'injected',
  'rainbow',
  'metamask',
  'coinbase',
  'walletconnect',
]);

const RootProvider = (): React.Node => (
  <Provider store={store}>
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <CallKeyserverEndpointProvider>
            <InitialReduxStateGate persistor={persistor}>
              <IdentityServiceContextProvider>
                <Router history={history.getHistoryObject()}>
                  <Route path="*" component={App} />
                </Router>
                <KeyserverConnectionsHandler socketComponent={Socket} />
                <PrekeysHandler />
                <SQLiteDataHandler />
                <IntegrityHandler />
                <ReportHandler canSendReports={true} />
              </IdentityServiceContextProvider>
            </InitialReduxStateGate>
          </CallKeyserverEndpointProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </Provider>
);

export default RootProvider;

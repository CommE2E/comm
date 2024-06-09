// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useFetchPendingUpdates } from 'lib/actions/update-actions.js';
import { preRequestUserStateForSingleKeyserverSelector } from 'lib/selectors/account-selectors.js';
import {
  cookieSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
} from 'lib/selectors/keyserver-selectors.js';
import { openSocketSelector } from 'lib/selectors/socket-selectors.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import Socket, { type BaseSocketProps } from 'lib/socket/socket.react.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { useNetworkConnected } from './redux/keyserver-reachability-handler.js';
import { useSelector } from './redux/redux-utils.js';
import {
  activeThreadSelector,
  webCalendarQuery,
} from './selectors/nav-selectors.js';
import {
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
} from './selectors/socket-selectors.js';
import { decompressMessage } from './utils/decompress.js';

const WebSocket: React.ComponentType<BaseSocketProps> =
  React.memo<BaseSocketProps>(function WebSocket(props) {
    const { keyserverID } = props;

    const cookie = useSelector(cookieSelector(keyserverID));
    const connection = useSelector(connectionSelector(keyserverID));
    invariant(connection, 'keyserver missing from keyserverStore');
    const active = useSelector(
      state =>
        !!state.currentUserInfo &&
        !state.currentUserInfo.anonymous &&
        state.lifecycleState !== 'background',
    );

    const openSocket = useSelector(openSocketSelector(keyserverID));
    invariant(openSocket, 'openSocket failed to be created');
    const sessionIdentification = useSelector(
      sessionIdentificationSelector(keyserverID),
    );
    const preRequestUserState = useSelector(
      preRequestUserStateForSingleKeyserverSelector(keyserverID),
    );
    const getInitialNotificationsEncryptedMessage =
      useInitialNotificationsEncryptedMessage(keyserverID);
    const getClientResponses = useSelector(state =>
      webGetClientResponsesSelector({
        state,
        getInitialNotificationsEncryptedMessage,
        keyserverID,
      }),
    );
    const sessionStateFunc = useSelector(
      webSessionStateFuncSelector(keyserverID),
    );
    const currentCalendarQuery = useSelector(webCalendarQuery);

    const reduxActiveThread = useSelector(activeThreadSelector);
    const windowActive = useSelector(state => state.windowActive);
    const activeThread = React.useMemo(() => {
      if (!active || !windowActive) {
        return null;
      }
      return reduxActiveThread;
    }, [active, windowActive, reduxActiveThread]);

    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();

    const lastCommunicatedPlatformDetails = useSelector(
      lastCommunicatedPlatformDetailsSelector(keyserverID),
    );

    const activeSessionRecovery = useSelector(
      state =>
        state.keyserverStore.keyserverInfos[keyserverID]?.connection
          .activeSessionRecovery,
    );

    const fetchPendingUpdates = useFetchPendingUpdates();

    const isConnectedToInternet = useNetworkConnected();

    return (
      <Socket
        {...props}
        active={active}
        openSocket={openSocket}
        getClientResponses={getClientResponses}
        activeThread={activeThread}
        sessionStateFunc={sessionStateFunc}
        sessionIdentification={sessionIdentification}
        cookie={cookie}
        connection={connection}
        currentCalendarQuery={currentCalendarQuery}
        frozen={false}
        preRequestUserState={preRequestUserState}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        lastCommunicatedPlatformDetails={lastCommunicatedPlatformDetails}
        decompressSocketMessage={decompressMessage}
        activeSessionRecovery={activeSessionRecovery}
        fetchPendingUpdates={fetchPendingUpdates}
        isConnectedToInternet={isConnectedToInternet}
      />
    );
  });

export default WebSocket;

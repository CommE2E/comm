// @flow

import invariant from 'invariant';
import * as React from 'react';

import { preRequestUserStateForSingleKeyserverSelector } from 'lib/selectors/account-selectors.js';
import {
  cookieSelector,
  urlPrefixSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
} from 'lib/selectors/keyserver-selectors.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import Socket, { type BaseSocketProps } from 'lib/socket/socket.react.js';
import type { OLMIdentityKeys } from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import {
  useGetSignedIdentityKeysBlob,
  useWebNotificationsSessionCreator,
} from './account/account-hooks.js';
import { useSelector } from './redux/redux-utils.js';
import {
  activeThreadSelector,
  webCalendarQuery,
} from './selectors/nav-selectors.js';
import {
  openSocketSelector,
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
} from './selectors/socket-selectors.js';
import { decompressMessage } from './utils/decompress.js';

const WebSocket: React.ComponentType<BaseSocketProps> =
  React.memo<BaseSocketProps>(function WebSocket(props) {
    const cookie = useSelector(cookieSelector(ashoatKeyserverID));
    const urlPrefix = useSelector(urlPrefixSelector(ashoatKeyserverID));
    invariant(urlPrefix, 'missing urlPrefix for given keyserver id');
    const connection = useSelector(connectionSelector(ashoatKeyserverID));
    invariant(connection, 'keyserver missing from keyserverStore');
    const active = useSelector(
      state =>
        !!state.currentUserInfo &&
        !state.currentUserInfo.anonymous &&
        state.lifecycleState !== 'background',
    );

    const openSocket = useSelector(openSocketSelector(ashoatKeyserverID));
    invariant(openSocket, 'openSocket failed to be created');
    const sessionIdentification = useSelector(
      sessionIdentificationSelector(ashoatKeyserverID),
    );
    const preRequestUserState = useSelector(
      preRequestUserStateForSingleKeyserverSelector(ashoatKeyserverID),
    );
    const getSignedIdentityKeysBlob = useGetSignedIdentityKeysBlob();
    const webNotificationsSessionCreator = useWebNotificationsSessionCreator();
    const webNotifsSessionCreatorForCookie = React.useCallback(
      async (
        notificationsIdentityKeys: OLMIdentityKeys,
        notificationsInitializationInfo: OlmSessionInitializationInfo,
      ) =>
        webNotificationsSessionCreator(
          cookie,
          notificationsIdentityKeys,
          notificationsInitializationInfo,
        ),
      [webNotificationsSessionCreator, cookie],
    );
    const getInitialNotificationsEncryptedMessage =
      useInitialNotificationsEncryptedMessage(webNotifsSessionCreatorForCookie);
    const getClientResponses = useSelector(state =>
      webGetClientResponsesSelector({
        state,
        getSignedIdentityKeysBlob,
        getInitialNotificationsEncryptedMessage,
      }),
    );
    const sessionStateFunc = useSelector(
      webSessionStateFuncSelector(ashoatKeyserverID),
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
      lastCommunicatedPlatformDetailsSelector(ashoatKeyserverID),
    );

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
        urlPrefix={urlPrefix}
        connection={connection}
        currentCalendarQuery={currentCalendarQuery}
        canSendReports={true}
        frozen={false}
        preRequestUserState={preRequestUserState}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        lastCommunicatedPlatformDetails={lastCommunicatedPlatformDetails}
        decompressSocketMessage={decompressMessage}
      />
    );
  });

export default WebSocket;

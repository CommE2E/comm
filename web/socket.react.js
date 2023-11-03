// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { useLogOut } from 'lib/actions/user-actions.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import {
  cookieSelector,
  urlPrefixSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
} from 'lib/selectors/keyserver-selectors.js';
import Socket, { type BaseSocketProps } from 'lib/socket/socket.react.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

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
    const cookie = useSelector(cookieSelector);
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
    const sessionIdentification = useSelector(sessionIdentificationSelector);
    const preRequestUserState = useSelector(preRequestUserStateSelector);
    const getClientResponses = useSelector(webGetClientResponsesSelector);
    const sessionStateFunc = useSelector(webSessionStateFuncSelector);
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
    const callLogOut = useLogOut();

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
        logOut={callLogOut}
        lastCommunicatedPlatformDetails={lastCommunicatedPlatformDetails}
        decompressSocketMessage={decompressMessage}
      />
    );
  });

export default WebSocket;

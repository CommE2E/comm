// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { logOut } from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import Socket, { type BaseSocketProps } from 'lib/socket/socket.react';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import { useSelector } from './redux/redux-utils';
import {
  activeThreadSelector,
  webCalendarQuery,
} from './selectors/nav-selectors';
import {
  openSocketSelector,
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
} from './selectors/socket-selectors';

const WebSocket: React.AbstractComponent<BaseSocketProps, mixed> = React.memo<BaseSocketProps>(function WebSocket(
  props
) {
  const cookie = useSelector(state => state.cookie);
  const urlPrefix = useSelector(state => state.urlPrefix);
  const connection = useSelector(state => state.connection);
  const active = useSelector(
    state =>
      !!state.currentUserInfo &&
      !state.currentUserInfo.anonymous &&
      state.lifecycleState !== 'background',
  );

  const openSocket = useSelector(openSocketSelector);
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
  const callLogOut = useServerCall(logOut);

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
    />
  );
});

export default WebSocket;

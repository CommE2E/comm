// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { logOut } from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { isLoggedIn } from 'lib/selectors/user-selectors';
import Socket, { type BaseSocketProps } from 'lib/socket/socket.react';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import { InputStateContext } from './input/input-state';
import {
  activeMessageListSelector,
  nativeCalendarQuery,
} from './navigation/nav-selectors';
import { NavContext } from './navigation/navigation-context';
import { useSelector } from './redux/redux-utils';
import {
  openSocketSelector,
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
} from './selectors/socket-selectors';

export default React.memo<BaseSocketProps>(function NativeSocket(
  props: BaseSocketProps,
) {
  const inputState = React.useContext(InputStateContext);
  const navContext = React.useContext(NavContext);

  const cookie = useSelector(state => state.cookie);
  const urlPrefix = useSelector(state => state.urlPrefix);
  const connection = useSelector(state => state.connection);
  const frozen = useSelector(state => state.frozen);
  const active = useSelector(
    state => isLoggedIn(state) && state.lifecycleState !== 'background',
  );

  const openSocket = useSelector(openSocketSelector);
  const sessionIdentification = useSelector(sessionIdentificationSelector);
  const preRequestUserState = useSelector(preRequestUserStateSelector);

  const getClientResponses = useSelector(state =>
    nativeGetClientResponsesSelector({
      redux: state,
      navContext,
    }),
  );
  const sessionStateFunc = useSelector(state =>
    nativeSessionStateFuncSelector({
      redux: state,
      navContext,
    }),
  );
  const currentCalendarQuery = useSelector(state =>
    nativeCalendarQuery({
      redux: state,
      navContext,
    }),
  );

  const canSendReports = useSelector(
    state =>
      !state.frozen &&
      state.connectivity.hasWiFi &&
      (!inputState || !inputState.uploadInProgress()),
  );

  const activeThread = React.useMemo(() => {
    if (!active) {
      return null;
    }
    return activeMessageListSelector(navContext);
  }, [active, navContext]);

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
      canSendReports={canSendReports}
      frozen={frozen}
      preRequestUserState={preRequestUserState}
      dispatch={dispatch}
      dispatchActionPromise={dispatchActionPromise}
      logOut={callLogOut}
    />
  );
});

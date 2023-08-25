// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { logOut, logOutActionTypes } from 'lib/actions/user-actions.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import {
  cookieSelector,
  urlPrefixSelector,
} from 'lib/selectors/keyserver-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import Socket, { type BaseSocketProps } from 'lib/socket/socket.react.js';
import { logInActionSources } from 'lib/types/account-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  fetchNewCookieFromNativeCredentials,
} from 'lib/utils/action-utils.js';

import { InputStateContext } from './input/input-state.js';
import {
  activeMessageListSelector,
  nativeCalendarQuery,
} from './navigation/nav-selectors.js';
import { NavContext } from './navigation/navigation-context.js';
import { useSelector } from './redux/redux-utils.js';
import { noDataAfterPolicyAcknowledgmentSelector } from './selectors/account-selectors.js';
import {
  openSocketSelector,
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
} from './selectors/socket-selectors.js';
import Alert from './utils/alert.js';
import { useInitialNotificationsEncryptedMessage } from './utils/crypto-utils.js';

const NativeSocket: React.ComponentType<BaseSocketProps> =
  React.memo<BaseSocketProps>(function NativeSocket(props: BaseSocketProps) {
    const inputState = React.useContext(InputStateContext);
    const navContext = React.useContext(NavContext);

    const cookie = useSelector(cookieSelector);
    const urlPrefix = useSelector(urlPrefixSelector);
    invariant(urlPrefix, 'missing urlPrefix for given keyserver id');
    const connection = useSelector(state => state.connection);
    const frozen = useSelector(state => state.frozen);
    const active = useSelector(
      state => isLoggedIn(state) && state.lifecycleState !== 'background',
    );
    const noDataAfterPolicyAcknowledgment = useSelector(
      noDataAfterPolicyAcknowledgmentSelector,
    );
    const currentUserInfo = useSelector(state => state.currentUserInfo);

    const openSocket = useSelector(openSocketSelector);
    invariant(openSocket, 'openSocket failed to be created');
    const sessionIdentification = useSelector(sessionIdentificationSelector);
    const preRequestUserState = useSelector(preRequestUserStateSelector);

    const getInitialNotificationsEncryptedMessage =
      useInitialNotificationsEncryptedMessage();

    const getClientResponses = useSelector(state =>
      nativeGetClientResponsesSelector({
        redux: state,
        navContext,
        getInitialNotificationsEncryptedMessage,
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

    const lastCommunicatedPlatformDetails = useSelector(
      state => state.lastCommunicatedPlatformDetails[urlPrefix],
    );

    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const callLogOut = useServerCall(logOut);

    const socketCrashLoopRecovery = React.useCallback(async () => {
      if (!accountHasPassword(currentUserInfo)) {
        dispatchActionPromise(
          logOutActionTypes,
          callLogOut(preRequestUserState),
        );
        Alert.alert(
          'Log in needed',
          'After acknowledging the policies, we need you to log in to your account again',
          [{ text: 'OK' }],
        );
        return;
      }

      await fetchNewCookieFromNativeCredentials(
        dispatch,
        cookie,
        urlPrefix,
        logInActionSources.refetchUserDataAfterAcknowledgment,
        getInitialNotificationsEncryptedMessage,
      );
    }, [
      callLogOut,
      cookie,
      currentUserInfo,
      dispatch,
      dispatchActionPromise,
      preRequestUserState,
      urlPrefix,
      getInitialNotificationsEncryptedMessage,
    ]);

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
        noDataAfterPolicyAcknowledgment={noDataAfterPolicyAcknowledgment}
        socketCrashLoopRecovery={socketCrashLoopRecovery}
        getInitialNotificationsEncryptedMessage={
          getInitialNotificationsEncryptedMessage
        }
        lastCommunicatedPlatformDetails={lastCommunicatedPlatformDetails}
      />
    );
  });

export default NativeSocket;

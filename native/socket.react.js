// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setActiveSessionRecoveryActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import { canResolveKeyserverSessionInvalidation } from 'lib/keyserver-conn/recovery-utils.js';
import { preRequestUserStateForSingleKeyserverSelector } from 'lib/selectors/account-selectors.js';
import {
  cookieSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
} from 'lib/selectors/keyserver-selectors.js';
import { openSocketSelector } from 'lib/selectors/socket-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import Socket, { type BaseSocketProps } from 'lib/socket/socket.react.js';
import { recoveryActionSources } from 'lib/types/account-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import {
  activeMessageListSelector,
  nativeCalendarQuery,
} from './navigation/nav-selectors.js';
import { NavContext } from './navigation/navigation-context.js';
import { useSelector } from './redux/redux-utils.js';
import { noDataAfterPolicyAcknowledgmentSelector } from './selectors/account-selectors.js';
import {
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
} from './selectors/socket-selectors.js';
import Alert from './utils/alert.js';
import { nativeNotificationsSessionCreator } from './utils/crypto-utils.js';
import { decompressMessage } from './utils/decompress.js';

const NativeSocket: React.ComponentType<BaseSocketProps> =
  React.memo<BaseSocketProps>(function NativeSocket(props: BaseSocketProps) {
    const navContext = React.useContext(NavContext);

    const { keyserverID } = props;

    const cookie = useSelector(cookieSelector(keyserverID));
    const connection = useSelector(connectionSelector(keyserverID));
    invariant(connection, 'keyserver missing from keyserverStore');
    const frozen = useSelector(state => state.frozen);
    const active = useSelector(
      state => isLoggedIn(state) && state.lifecycleState !== 'background',
    );
    const noDataAfterPolicyAcknowledgment = useSelector(
      noDataAfterPolicyAcknowledgmentSelector(keyserverID),
    );
    const currentUserInfo = useSelector(state => state.currentUserInfo);

    const openSocket = useSelector(openSocketSelector(keyserverID));
    invariant(openSocket, 'openSocket failed to be created');
    const sessionIdentification = useSelector(
      sessionIdentificationSelector(keyserverID),
    );
    const preRequestUserState = useSelector(
      preRequestUserStateForSingleKeyserverSelector(keyserverID),
    );

    const getInitialNotificationsEncryptedMessage =
      useInitialNotificationsEncryptedMessage(
        nativeNotificationsSessionCreator,
      );

    const getClientResponses = useSelector(state =>
      nativeGetClientResponsesSelector({
        redux: state,
        navContext,
        getInitialNotificationsEncryptedMessage,
        keyserverID,
      }),
    );
    const sessionStateFunc = useSelector(state =>
      nativeSessionStateFuncSelector(keyserverID)({
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

    const activeThread = React.useMemo(() => {
      if (!active) {
        return null;
      }
      return activeMessageListSelector(navContext);
    }, [active, navContext]);

    const lastCommunicatedPlatformDetails = useSelector(
      lastCommunicatedPlatformDetailsSelector(keyserverID),
    );

    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();

    const hasPassword = accountHasPassword(currentUserInfo);
    const socketCrashLoopRecovery = React.useCallback(() => {
      if (
        !canResolveKeyserverSessionInvalidation() ||
        (!hasPassword && !usingCommServicesAccessToken)
      ) {
        Alert.alert(
          'Log in needed',
          'After acknowledging the policies, we need you to log in to your ' +
            'account again',
          [{ text: 'OK' }],
        );
      }
      dispatch({
        type: setActiveSessionRecoveryActionType,
        payload: {
          activeSessionRecovery:
            recoveryActionSources.refetchUserDataAfterAcknowledgment,
          keyserverID,
        },
      });
    }, [hasPassword, dispatch, keyserverID]);

    const activeSessionRecovery = useSelector(
      state =>
        state.keyserverStore.keyserverInfos[keyserverID]?.connection
          .activeSessionRecovery,
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
        connection={connection}
        currentCalendarQuery={currentCalendarQuery}
        frozen={frozen}
        preRequestUserState={preRequestUserState}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        noDataAfterPolicyAcknowledgment={noDataAfterPolicyAcknowledgment}
        socketCrashLoopRecovery={socketCrashLoopRecovery}
        lastCommunicatedPlatformDetails={lastCommunicatedPlatformDetails}
        decompressSocketMessage={decompressMessage}
        activeSessionRecovery={activeSessionRecovery}
      />
    );
  });

export default NativeSocket;

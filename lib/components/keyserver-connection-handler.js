// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  keyserverAuthActionTypes,
  logOutActionTypes,
  useKeyserverAuth,
  useLogOut,
} from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { filterThreadIDsInFilterList } from '../reducers/calendar-filters-reducer.js';
import {
  connectionSelector,
  cookieSelector,
  deviceTokenSelector,
} from '../selectors/keyserver-selectors.js';
import { isLoggedInToKeyserver } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { OlmSessionCreatorContext } from '../shared/olm-session-creator-context.js';
import type { BaseSocketProps } from '../socket/socket.react.js';
import { logInActionSources } from '../types/account-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

type Props = {
  ...BaseSocketProps,
  +keyserverID: string,
  +socketComponent: React.ComponentType<BaseSocketProps>,
};
function KeyserverConnectionHandler(props: Props) {
  const { socketComponent: Socket, keyserverID, ...rest } = props;

  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();
  const keyserverAuth = useKeyserverAuth();

  const hasConnectionIssue = useSelector(
    state => !!connectionSelector(keyserverID)(state)?.connectionIssue,
  );
  const cookie = useSelector(cookieSelector(keyserverID));

  const keyserverDeviceToken = useSelector(deviceTokenSelector(keyserverID));
  // We have an assumption that we should be always connected to Ashoat's
  // keyserver. It is possible that a token which it has is correct, so we can
  // try to use it. In worst case it is invalid and our push-handler will try
  // to fix it.
  const ashoatKeyserverDeviceToken = useSelector(
    deviceTokenSelector(ashoatKeyserverID),
  );
  const deviceToken = keyserverDeviceToken ?? ashoatKeyserverDeviceToken;

  const navInfo = useSelector(state => state.navInfo);
  const calendarFilters = useSelector(state => state.calendarFilters);
  const calendarQuery = React.useMemo(() => {
    const filters = filterThreadIDsInFilterList(
      calendarFilters,
      (threadID: string) => extractKeyserverIDFromID(threadID) === keyserverID,
    );
    return {
      startDate: navInfo.startDate,
      endDate: navInfo.endDate,
      filters,
    };
  }, [calendarFilters, keyserverID, navInfo.endDate, navInfo.startDate]);

  React.useEffect(() => {
    if (hasConnectionIssue) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, hasConnectionIssue, dispatchActionPromise]);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  const olmSessionCreator = React.useContext(OlmSessionCreatorContext);
  invariant(olmSessionCreator, 'Olm session creator should be set');

  const authInProgress = React.useRef(false);
  const isUserAuthenticated = useSelector(isLoggedInToKeyserver(keyserverID));

  React.useEffect(() => {
    if (
      !usingCommServicesAccessToken ||
      authInProgress.current ||
      isUserAuthenticated
    ) {
      return;
    }
    authInProgress.current = true;

    void (async () => {
      try {
        const keyserverKeys =
          await identityClient.getKeyserverKeys(keyserverID);

        const [notifsSession, contentSession] = await Promise.all([
          olmSessionCreator.notificationsSessionCreator(
            cookie,
            keyserverKeys.identityKeysBlob.notificationIdentityPublicKeys,
            keyserverKeys.notifInitializationInfo,
            keyserverID,
          ),
          olmSessionCreator.contentSessionCreator(
            keyserverKeys.identityKeysBlob.primaryIdentityPublicKeys,
            keyserverKeys.contentInitializationInfo,
          ),
        ]);

        const { userID, deviceID } = await getAuthMetadata();
        invariant(userID, 'userID should be set');
        invariant(deviceID, 'deviceID should be set');

        const deviceTokenUpdateInput = deviceToken
          ? { [keyserverID]: { deviceToken } }
          : {};

        await dispatchActionPromise(
          keyserverAuthActionTypes,
          keyserverAuth({
            userID,
            deviceID,
            doNotRegister: false,
            calendarQuery,
            deviceTokenUpdateInput,
            logInActionSource: process.env.BROWSER
              ? logInActionSources.keyserverAuthFromWeb
              : logInActionSources.keyserverAuthFromNative,
            keyserverData: {
              [keyserverID]: {
                initialContentEncryptedMessage: contentSession,
                initialNotificationsEncryptedMessage: notifsSession,
              },
            },
          }),
        );
      } catch (e) {
        console.log(
          `Error while authenticating to keyserver with id ${keyserverID}`,
          e,
        );
      } finally {
        authInProgress.current = false;
      }
    })();
  }, [
    keyserverID,
    identityClient,
    olmSessionCreator,
    cookie,
    getAuthMetadata,
    dispatchActionPromise,
    keyserverAuth,
    deviceToken,
    calendarQuery,
    isUserAuthenticated,
  ]);

  if (keyserverID !== ashoatKeyserverID) {
    return null;
  }
  return <Socket {...rest} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;

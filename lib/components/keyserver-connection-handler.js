// @flow

import invariant from 'invariant';
import * as React from 'react';

import { logOutActionTypes, useLogOut } from '../actions/user-actions.js';
import {
  connectionSelector,
  cookieSelector,
} from '../selectors/keyserver-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { OlmSessionCreatorContext } from '../shared/olm-session-creator-context.js';
import type { BaseSocketProps } from '../socket/socket.react.js';
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

  const hasConnectionIssue = useSelector(
    state => !!connectionSelector(keyserverID)(state)?.connectionIssue,
  );
  const cookie = useSelector(cookieSelector(keyserverID));

  React.useEffect(() => {
    if (hasConnectionIssue) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, hasConnectionIssue, dispatchActionPromise]);

  const identityClient = React.useContext(
    IdentityClientContext,
  )?.identityClient;
  invariant(identityClient, 'Identity client should be set');

  const olmSessionCreator = React.useContext(OlmSessionCreatorContext);
  invariant(olmSessionCreator, 'Olm session creator should be set');

  React.useEffect(() => {
    if (!usingCommServicesAccessToken) {
      return;
    }

    void (async () => {
      try {
        const keyserverKeys =
          await identityClient.getKeyserverKeys(keyserverID);

        await olmSessionCreator.notificationsSessionCreator(
          cookie,
          keyserverKeys.identityKeysBlob.notificationIdentityPublicKeys,
          keyserverKeys.notifInitializationInfo,
          keyserverID,
        );
      } catch (e) {
        console.log(
          `Error getting keys for keyserver with id ${keyserverID}`,
          e,
        );
      }
    })();
  }, [keyserverID, identityClient, olmSessionCreator, cookie]);

  if (keyserverID !== ashoatKeyserverID) {
    return null;
  }
  return <Socket {...rest} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;

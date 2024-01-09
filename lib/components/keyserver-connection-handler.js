// @flow

import * as React from 'react';

import { logOutActionTypes, useLogOut } from '../actions/user-actions.js';
import { connectionSelector } from '../selectors/keyserver-selectors.js';
import type { BaseSocketProps } from '../socket/socket.react.js';
import { useDispatchActionPromise } from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';
import {IdentityClientContext} from "../shared/identity-client-context.js";
import {usingCommServicesAccessToken} from "../utils/services-utils.js";

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

  React.useEffect(() => {
    if (hasConnectionIssue) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, hasConnectionIssue, dispatchActionPromise]);

  const identityClient = React.useContext(IdentityClientContext)?.identityClient;
  React.useEffect(() => {
    if (!usingCommServicesAccessToken) {
      return;
    }

    void (async () => {
      const keyserverKeys = await identityClient?.getKeyserverKeys(keyserverID);
      console.log(JSON.stringify(keyserverKeys));
    })();
  }, [keyserverID]);

  if (keyserverID !== ashoatKeyserverID) {
    return null;
  }
  return <Socket {...rest} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;

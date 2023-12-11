// @flow

import * as React from 'react';

import { logOutActionTypes, useLogOut } from '../actions/user-actions.js';
import { connectionSelector } from '../selectors/keyserver-selectors.js';
import type { BaseSocketProps } from '../socket/socket.react.js';
import { useDispatchActionPromise } from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';
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

  const connectionIssue = useSelector(
    connectionSelector(keyserverID),
  )?.connectionIssue;

  React.useEffect(() => {
    if (connectionIssue) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, connectionIssue, dispatchActionPromise]);

  if (keyserverID !== ashoatKeyserverID) {
    return null;
  }
  return <Socket {...rest} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;

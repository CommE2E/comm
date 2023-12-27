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

  const shouldLogOut = useSelector(state => {
    const connectionIssue =
      connectionSelector(keyserverID)(state)?.connectionIssue;
    return !!connectionIssue && connectionIssue !== 'temporarily_connected';
  });

  React.useEffect(() => {
    if (shouldLogOut) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, shouldLogOut, dispatchActionPromise]);

  if (keyserverID !== ashoatKeyserverID) {
    return null;
  }
  return <Socket {...rest} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;

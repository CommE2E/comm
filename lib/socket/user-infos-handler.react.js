// @flow

import * as React from 'react';

import { processNewUserIDsActionType } from '../actions/user-actions.js';
import {
  serverServerSocketMessageValidator,
  type SocketListener,
  type ClientServerSocketMessage,
} from '../types/socket-types.js';
import { extractUserIDsFromPayload } from '../utils/conversion-utils.js';
import { useDispatch } from '../utils/redux-utils.js';

type Props = {
  +addListener: (listener: SocketListener) => mixed,
  +removeListener: (listener: SocketListener) => mixed,
};

export default function SocketMessageUserInfosHandler(
  props: Props,
): React.Node {
  const dispatch = useDispatch();
  const onMessage = React.useCallback(
    (message: ClientServerSocketMessage) => {
      const newUserIDs = extractUserIDsFromPayload(
        serverServerSocketMessageValidator,
        message,
      );
      if (newUserIDs.length > 0) {
        dispatch({
          type: processNewUserIDsActionType,
          payload: { userIDs: newUserIDs },
        });
      }
    },
    [dispatch],
  );

  const { addListener, removeListener } = props;

  React.useEffect(() => {
    addListener(onMessage);
    return () => {
      removeListener(onMessage);
    };
  }, [addListener, removeListener, onMessage]);

  return null;
}

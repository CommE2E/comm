// @flow

import * as React from 'react';

import { processNewUserIDsActionType } from '../actions/user-actions.js';
import type { Dispatch } from '../types/redux-types.js';
import {
  serverServerSocketMessageValidator,
  type SocketListener,
  type ClientServerSocketMessage,
} from '../types/socket-types.js';
import { extractUserIDsFromPayload } from '../utils/conversion-utils.js';

type Props = {
  +addListener: (listener: SocketListener) => mixed,
  +removeListener: (listener: SocketListener) => mixed,
  +dispatch: Dispatch,
};

export default function SocketMessageUserInfosHandler(
  props: Props,
): React.Node {
  const onMessage = React.useCallback(
    (message: ClientServerSocketMessage) => {
      const newUserIDs = extractUserIDsFromPayload(
        serverServerSocketMessageValidator,
        message,
      );
      if (newUserIDs.length > 0) {
        props.dispatch({
          type: processNewUserIDsActionType,
          payload: { userIDs: newUserIDs },
        });
      }
    },
    [props],
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

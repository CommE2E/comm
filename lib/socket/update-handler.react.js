// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useEffect } from 'react';

import { connectionSelector } from '../selectors/keyserver-selectors.js';
import {
  type ClientSocketMessageWithoutID,
  type SocketListener,
  type ClientServerSocketMessage,
  serverSocketMessageTypes,
  clientSocketMessageTypes,
} from '../types/socket-types.js';
import { processUpdatesActionType } from '../types/update-types.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

type Props = {
  +sendMessage: (message: ClientSocketMessageWithoutID) => number,
  +addListener: (listener: SocketListener) => void,
  +removeListener: (listener: SocketListener) => void,
  +keyserverID: string,
};
export default function UpdateHandler(props: Props): React.Node {
  const { addListener, removeListener, sendMessage, keyserverID } = props;

  const dispatch = useDispatch();
  const connection = useSelector(connectionSelector(ashoatKeyserverID));
  invariant(connection, 'keyserver missing from keyserverStore');
  const connectionStatus = connection.status;
  const onMessage = React.useCallback(
    (message: ClientServerSocketMessage) => {
      if (message.type !== serverSocketMessageTypes.UPDATES) {
        return;
      }
      dispatch({
        type: processUpdatesActionType,
        payload: { ...message.payload, keyserverID },
      });
      if (connectionStatus !== 'connected') {
        return;
      }
      sendMessage({
        type: clientSocketMessageTypes.ACK_UPDATES,
        payload: {
          currentAsOf: message.payload.updatesResult.currentAsOf,
        },
      });
    },
    [connectionStatus, dispatch, keyserverID, sendMessage],
  );
  useEffect(() => {
    addListener(onMessage);
    return () => {
      removeListener(onMessage);
    };
  }, [addListener, removeListener, onMessage]);

  return null;
}

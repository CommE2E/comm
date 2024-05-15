// @flow
import * as React from 'react';
import { useEffect } from 'react';

import {
  type SocketListener,
  type ClientServerSocketMessage,
} from '../types/socket-types.js';
import { serverServerSocketMessageValidator } from '../types/socket-types.js';
import { extractUserIDsFromPayload } from '../utils/conversion-utils.js';

type Props = {
  +addListener: (listener: SocketListener) => void,
  +removeListener: (listener: SocketListener) => void,
};

export default function UserInfosHandler(props: Props): React.Node {
  const { addListener, removeListener } = props;

  const onMessage = React.useCallback((message: ClientServerSocketMessage) => {
    // eslint-disable-next-line no-unused-vars
    const newUserIDs = extractUserIDsFromPayload(
      serverServerSocketMessageValidator,
      message,
    );
    // TODO: dispatch an action adding the new user ids to the UserStore
  }, []);

  useEffect(() => {
    addListener(onMessage);
    return () => {
      removeListener(onMessage);
    };
  }, [addListener, removeListener, onMessage]);

  return null;
}

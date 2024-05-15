// @flow

import * as React from 'react';

import {
  serverServerSocketMessageValidator,
  type SocketListener,
  type ClientServerSocketMessage,
} from '../types/socket-types.js';
import { extractUserIDsFromPayload } from '../utils/conversion-utils.js';

type Props = {
  +addListener: (listener: SocketListener) => mixed,
  +removeListener: (listener: SocketListener) => mixed,
};

export default function SocketMessageUserInfosHandler(
  props: Props,
): React.Node {
  const { addListener, removeListener } = props;

  const onMessage = React.useCallback((message: ClientServerSocketMessage) => {
    // eslint-disable-next-line no-unused-vars
    const newUserIDs = extractUserIDsFromPayload(
      serverServerSocketMessageValidator,
      message,
    );
    // TODO: dispatch an action adding the new user ids to the UserStore
  }, []);

  React.useEffect(() => {
    addListener(onMessage);
    return () => {
      removeListener(onMessage);
    };
  }, [addListener, removeListener, onMessage]);

  return null;
}

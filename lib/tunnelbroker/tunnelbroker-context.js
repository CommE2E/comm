// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type TunnelbrokerMessage } from '../types/tunnelbroker/messages.js';
import type { ConnectionInitializationMessage } from '../types/tunnelbroker/session-types.js';

export type ClientMessageToDevice = {
  +deviceID: string,
  +payload: string,
};

export type TunnelbrokerSocketListener = (
  message: TunnelbrokerMessage,
) => mixed;

type TunnelbrokerContextType = {
  +sendMessage: (message: ClientMessageToDevice) => Promise<void>,
  +addListener: (listener: TunnelbrokerSocketListener) => void,
  +removeListener: (listener: TunnelbrokerSocketListener) => void,
  +connected: boolean,
};

const TunnelbrokerContext: React.Context<?TunnelbrokerContextType> =
  React.createContext<?TunnelbrokerContextType>();

type Props = {
  +children: React.Node,
  +openSocket: () => WebSocket,
  +initMessage: ?ConnectionInitializationMessage,
};

function TunnelbrokerProvider(props: Props): React.Node {
  const { children } = props;
  const [connected] = React.useState(false);
  const listeners = React.useRef<Set<TunnelbrokerSocketListener>>(new Set());

  const sendMessage: () => Promise<void> = React.useCallback(() => {
    return new Promise(() => {});
  }, []);

  const addListener = React.useCallback(
    (listener: TunnelbrokerSocketListener) => {
      listeners.current.add(listener);
    },
    [],
  );

  const removeListener = React.useCallback(
    (listener: TunnelbrokerSocketListener) => {
      listeners.current.delete(listener);
    },
    [],
  );

  const value: TunnelbrokerContextType = React.useMemo(
    () => ({
      sendMessage,
      connected,
      addListener,
      removeListener,
    }),
    [addListener, connected, removeListener, sendMessage],
  );

  return (
    <TunnelbrokerContext.Provider value={value}>
      {children}
    </TunnelbrokerContext.Provider>
  );
}

function useTunnelbroker(): TunnelbrokerContextType {
  const context = React.useContext(TunnelbrokerContext);
  invariant(context, 'TunnelbrokerContext not found');

  return context;
}

export { TunnelbrokerProvider, useTunnelbroker };

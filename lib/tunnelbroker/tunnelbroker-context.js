// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type TunnelbrokerMessage } from '../types/tunnelbroker/messages.js';
import type { ConnectionInitializationMessage } from '../types/tunnelbroker/session-types.js';

export type ClientMessageToDevice = {
  +deviceID: string,
  +payload: string,
};

export type TunnelbrokerSocketListener = (message: TunnelbrokerMessage) => void;

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

// eslint-disable-next-line no-unused-vars
function TunnelbrokerProvider(props: Props): React.Node {
  const { children, initMessage, openSocket } = props;
  const [connected, setConnected] = React.useState(false);
  const listeners = React.useRef<Set<TunnelbrokerSocketListener>>(new Set());
  const socket = React.useRef<?WebSocket>(null);

  React.useEffect(() => {
    if (connected || !initMessage) {
      return;
    }

    const tunnelbrokerSocket = openSocket();

    tunnelbrokerSocket.onopen = () => {
      tunnelbrokerSocket.send(JSON.stringify(initMessage));
    };

    tunnelbrokerSocket.onclose = () => {
      setConnected(false);
      console.error('Connection to Tunnelbroker closed');
    };
    tunnelbrokerSocket.onerror = e => {
      console.error('Tunnelbroker socket error:', e.message);
    };
    tunnelbrokerSocket.onmessage = (event: MessageEvent) => {
      console.log('Received message:', event.data);
    };

    socket.current = tunnelbrokerSocket;
  }, [connected, initMessage, openSocket]);

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

// eslint-disable-next-line no-unused-vars
function useTunnelbroker(): TunnelbrokerContextType {
  const context = React.useContext(TunnelbrokerContext);
  invariant(context, 'TunnelbrokerContext not found');

  return context;
}

export { TunnelbrokerProvider, useTunnelbroker };

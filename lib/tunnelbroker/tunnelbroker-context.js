// @flow

import invariant from 'invariant';
import * as React from 'react';

import { tunnnelbrokerURL } from '../facts/tunnelbroker.js';
import type { MessageReceiveConfirmation } from '../types/tunnelbroker/message-receive-confirmation-types.js';
import {
  type TunnelbrokerMessage,
  tunnelbrokerMessageTypes,
  tunnelbrokerMessageValidator,
} from '../types/tunnelbroker/messages.js';
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
  +initMessage: ?ConnectionInitializationMessage,
};

function TunnelbrokerProvider(props: Props): React.Node {
  const { children, initMessage } = props;
  const [connected, setConnected] = React.useState(false);
  const listeners = React.useRef<Set<TunnelbrokerSocketListener>>(new Set());
  const socket = React.useRef<?WebSocket>(null);

  React.useEffect(() => {
    if (connected || !initMessage) {
      return;
    }

    const tunnelbrokerSocket = new WebSocket(tunnnelbrokerURL);

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
      if (typeof event.data !== 'string') {
        console.error('socket received a non-string message');
        return;
      }
      let rawMessage;
      try {
        rawMessage = JSON.parse(event.toString());
      } catch (e) {
        console.error('error while parsing Tunnelbroker message:', e.message);
        return;
      }

      if (!tunnelbrokerMessageValidator.is(rawMessage)) {
        console.error('invalid TunnelbrokerMessage');
        return;
      }
      const message: TunnelbrokerMessage = rawMessage;

      for (const listener of listeners.current) {
        listener(message);
      }

      if (
        message.type ===
        tunnelbrokerMessageTypes.CONNECTION_INITIALIZATION_RESPONSE
      ) {
        if (message.status.type === 'Success' && !connected) {
          setConnected(true);
          console.info('session with Tunnelbroker created');
        } else if (message.status.type === 'Success' && connected) {
          console.info(
            'received ConnectionInitializationResponse with status: Success for already connected socket',
          );
        } else {
          setConnected(false);
          console.error(
            'creating session with Tunnelbroker error:',
            message.status.data,
          );
        }
      } else if (message.type === tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE) {
        const confirmation: MessageReceiveConfirmation = {
          type: tunnelbrokerMessageTypes.MESSAGE_RECEIVE_CONFIRMATION,
          messageIDs: [message.messageID],
        };
        socket.current?.send(JSON.stringify(confirmation));
      }
    };

    socket.current = tunnelbrokerSocket;
  }, [connected, initMessage]);

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

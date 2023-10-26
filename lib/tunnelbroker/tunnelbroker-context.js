// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import type { MessageReceiveConfirmation } from '../types/tunnelbroker/message-receive-confirmation-types.js';
import type { MessageSentStatus } from '../types/tunnelbroker/message-to-device-request-status-types.js';
import type { MessageToDeviceRequest } from '../types/tunnelbroker/message-to-device-request-types.js';
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

export type TunnelbrokerSocketListener = (message: TunnelbrokerMessage) => void;

type PromiseCallbacks = {
  +resolve: () => void,
  +reject: (error: string) => void,
};
type Promises = { [clientMessageID: string]: PromiseCallbacks };

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
  const { children, initMessage, openSocket } = props;
  const [connected, setConnected] = React.useState(false);
  const listeners = React.useRef<Set<TunnelbrokerSocketListener>>(new Set());
  const socket = React.useRef<?WebSocket>(null);
  const promises = React.useRef<Promises>({});

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
      if (typeof event.data !== 'string') {
        console.error('socket received a non-string message');
        return;
      }
      const rawMessage = JSON.parse(event.data);

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
        if (message.status.type === 'Success') {
          setConnected(true);
          console.info('session with Tunnelbroker created');
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
      } else if (
        message.type ===
        tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE_REQUEST_STATUS
      ) {
        //TODO: add timout to reject promise after some time
        for (const status: MessageSentStatus of message.clientMessageIDs) {
          console.log(status);
          if (status.type === 'Success') {
            promises.current[status.data]?.resolve();
            delete promises.current[status.data];
          } else if (status.type === 'Error') {
            promises.current[status.data.id]?.reject(status.data.error);
            delete promises.current[status.data.id];
          } else if (status.type === 'SerializationError') {
            console.error('SerializationError for message: ', status.data);
          } else if (status.type === 'InvalidRequest') {
            console.log('Tunnelbroker recorded InvalidRequest');
          }
        }
      }
    };

    socket.current = tunnelbrokerSocket;
  }, [connected, initMessage, openSocket]);

  const sendMessage: (message: ClientMessageToDevice) => Promise<void> =
    React.useCallback(
      (message: ClientMessageToDevice) => {
        if (!connected || !socket.current) {
          throw new Error('Tunnelbroker not connected');
        }
        const clientMessageID = uuid.v4();
        const messageToDevice: MessageToDeviceRequest = {
          type: tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE_REQUEST,
          clientMessageID,
          deviceID: message.deviceID,
          payload: message.payload,
        };

        return new Promise((resolve, reject) => {
          promises.current[clientMessageID] = {
            resolve,
            reject,
          };
          socket.current?.send(JSON.stringify(messageToDevice));
        });
      },
      [connected],
    );

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

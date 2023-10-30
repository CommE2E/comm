// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { tunnnelbrokerURL } from '../facts/tunnelbroker.js';
import { tunnelbrokerHeartbeatTimeout } from '../shared/timeouts.js';
import type { Heartbeat } from '../types/tunnelbroker/heartbeat-types.js';
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

export type TunnelbrokerSocketListener = (
  message: TunnelbrokerMessage,
) => mixed;

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
  +initMessage: ?ConnectionInitializationMessage,
};

function TunnelbrokerProvider(props: Props): React.Node {
  const { children, initMessage } = props;
  const [connected, setConnected] = React.useState(false);
  const listeners = React.useRef<Set<TunnelbrokerSocketListener>>(new Set());
  const socket = React.useRef<?WebSocket>(null);
  const promises = React.useRef<Promises>({});
  const heartbeatTimeoutID = React.useRef();

  const stopHeartbeatTimeout = React.useCallback(() => {
    if (heartbeatTimeoutID.current) {
      clearTimeout(heartbeatTimeoutID.current);
      heartbeatTimeoutID.current = null;
    }
  }, []);

  const resetHeartbeatTimeout = React.useCallback(() => {
    stopHeartbeatTimeout();
    heartbeatTimeoutID.current = setTimeout(() => {
      socket.current?.close();
      setConnected(false);
    }, tunnelbrokerHeartbeatTimeout);
  }, [stopHeartbeatTimeout]);

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
      console.log('Connection to Tunnelbroker closed');
    };
    tunnelbrokerSocket.onerror = e => {
      console.log('Tunnelbroker socket error:', e.message);
    };
    tunnelbrokerSocket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') {
        console.log('socket received a non-string message');
        return;
      }
      let rawMessage;
      try {
        rawMessage = JSON.parse(event.data);
      } catch (e) {
        console.log('error while parsing Tunnelbroker message:', e.message);
        return;
      }

      if (!tunnelbrokerMessageValidator.is(rawMessage)) {
        console.log('invalid TunnelbrokerMessage');
        return;
      }
      const message: TunnelbrokerMessage = rawMessage;

      resetHeartbeatTimeout();

      for (const listener of listeners.current) {
        listener(message);
      }

      if (
        message.type ===
        tunnelbrokerMessageTypes.CONNECTION_INITIALIZATION_RESPONSE
      ) {
        if (message.status.type === 'Success' && !connected) {
          setConnected(true);
          console.log('session with Tunnelbroker created');
        } else if (message.status.type === 'Success' && connected) {
          console.log(
            'received ConnectionInitializationResponse with status: Success for already connected socket',
          );
        } else {
          setConnected(false);
          console.log(
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
        for (const status: MessageSentStatus of message.clientMessageIDs) {
          if (status.type === 'Success') {
            promises.current[status.data]?.resolve();
            delete promises.current[status.data];
          } else if (status.type === 'Error') {
            promises.current[status.data.id]?.reject(status.data.error);
            delete promises.current[status.data.id];
          } else if (status.type === 'SerializationError') {
            console.log('SerializationError for message: ', status.data);
          } else if (status.type === 'InvalidRequest') {
            console.log('Tunnelbroker recorded InvalidRequest');
          }
        }
      } else if (message.type === tunnelbrokerMessageTypes.HEARTBEAT) {
        const heartbeat: Heartbeat = {
          type: tunnelbrokerMessageTypes.HEARTBEAT,
        };
        socket.current?.send(JSON.stringify(heartbeat));
      }
    };

    socket.current = tunnelbrokerSocket;
  }, [connected, initMessage, resetHeartbeatTimeout, stopHeartbeatTimeout]);

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

function useTunnelbroker(): TunnelbrokerContextType {
  const context = React.useContext(TunnelbrokerContext);
  invariant(context, 'TunnelbrokerContext not found');

  return context;
}

export { TunnelbrokerProvider, useTunnelbroker };

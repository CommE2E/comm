// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import uuid from 'uuid';

import type { SecondaryTunnelbrokerConnection } from './secondary-tunnelbroker-connection.js';
import { tunnnelbrokerURL } from '../facts/tunnelbroker.js';
import { peerToPeerMessageHandler } from '../handlers/peer-to-peer-message-handler.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { tunnelbrokerHeartbeatTimeout } from '../shared/timeouts.js';
import { isWebPlatform } from '../types/device-types.js';
import type { MessageReceiveConfirmation } from '../types/tunnelbroker/message-receive-confirmation-types.js';
import type { MessageSentStatus } from '../types/tunnelbroker/message-to-device-request-status-types.js';
import type { MessageToDeviceRequest } from '../types/tunnelbroker/message-to-device-request-types.js';
import {
  type TunnelbrokerMessage,
  tunnelbrokerMessageTypes,
  tunnelbrokerMessageValidator,
} from '../types/tunnelbroker/messages.js';
import {
  type PeerToPeerMessage,
  peerToPeerMessageValidator,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import type {
  AnonymousInitializationMessage,
  ConnectionInitializationMessage,
  TunnelbrokerInitializationMessage,
  TunnelbrokerDeviceTypes,
} from '../types/tunnelbroker/session-types.js';
import type { Heartbeat } from '../types/websocket/heartbeat-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { useSelector } from '../utils/redux-utils.js';

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
  +isAuthorized: boolean,
  +setUnauthorizedDeviceID: (unauthorizedDeviceID: ?string) => void,
};

const TunnelbrokerContext: React.Context<?TunnelbrokerContextType> =
  React.createContext<?TunnelbrokerContextType>();

type Props = {
  +children: React.Node,
  +shouldBeClosed?: boolean,
  +onClose?: () => mixed,
  +secondaryTunnelbrokerConnection?: SecondaryTunnelbrokerConnection,
};

function getTunnelbrokerDeviceType(): TunnelbrokerDeviceTypes {
  return isWebPlatform(getConfig().platformDetails.platform) ? 'web' : 'mobile';
}

function createAnonymousInitMessage(
  deviceID: string,
): AnonymousInitializationMessage {
  return ({
    type: 'AnonymousInitializationMessage',
    deviceID,
    deviceType: getTunnelbrokerDeviceType(),
  }: AnonymousInitializationMessage);
}

function TunnelbrokerProvider(props: Props): React.Node {
  const { children, shouldBeClosed, onClose, secondaryTunnelbrokerConnection } =
    props;

  const accessToken = useSelector(state => state.commServicesAccessToken);
  const userID = useSelector(state => state.currentUserInfo?.id);

  const [unauthorizedDeviceID, setUnauthorizedDeviceID] =
    React.useState<?string>(null);
  const isAuthorized = !unauthorizedDeviceID;

  const createInitMessage = React.useCallback(async () => {
    if (shouldBeClosed) {
      return null;
    }

    if (unauthorizedDeviceID) {
      return createAnonymousInitMessage(unauthorizedDeviceID);
    }

    if (!accessToken || !userID) {
      return null;
    }

    const deviceID = await getContentSigningKey();
    if (!deviceID) {
      return null;
    }
    return ({
      type: 'ConnectionInitializationMessage',
      deviceID,
      accessToken,
      userID,
      deviceType: getTunnelbrokerDeviceType(),
    }: ConnectionInitializationMessage);
  }, [accessToken, shouldBeClosed, unauthorizedDeviceID, userID]);

  const previousInitMessage =
    React.useRef<?TunnelbrokerInitializationMessage>(null);

  const [connected, setConnected] = React.useState(false);
  const listeners = React.useRef<Set<TunnelbrokerSocketListener>>(new Set());
  const socket = React.useRef<?WebSocket>(null);
  const currentlyProcessedMessage = React.useRef<?Promise<mixed>>(null);
  const socketSessionCounter = React.useRef(0);
  const promises = React.useRef<Promises>({});
  const heartbeatTimeoutID = React.useRef<?TimeoutID>();

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient } = identityContext;

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

  // determine if the socket is active (not closed or closing)
  const isSocketActive =
    socket.current?.readyState === WebSocket.OPEN ||
    socket.current?.readyState === WebSocket.CONNECTING;

  const connectionChangePromise = React.useRef<?Promise<void>>(null);
  // The Tunnelbroker connection can have 4 states:
  // - DISCONNECTED: isSocketActive = false, connected = false
  //   Should be in this state when initMessage is null
  // - CONNECTING: isSocketActive = true, connected = false
  //   This lasts until Tunnelbroker sends ConnectionInitializationResponse
  // - CONNECTED: isSocketActive = true, connected = true
  // - DISCONNECTING: isSocketActive = false, connected = true
  //   This lasts between socket.close() and socket.onclose()
  React.useEffect(() => {
    connectionChangePromise.current = (async () => {
      await connectionChangePromise.current;
      try {
        const initMessage = await createInitMessage();
        const initMessageChanged = !_isEqual(
          previousInitMessage.current,
          initMessage,
        );
        previousInitMessage.current = initMessage;

        // when initMessage changes, we need to close the socket
        // and open a new one
        if (
          (!initMessage || initMessageChanged) &&
          isSocketActive &&
          socket.current
        ) {
          socket.current?.close();
          return;
        }

        // when we're already connected (or pending disconnection),
        // or there's no init message to start with, we don't need
        // to do anything
        if (connected || !initMessage || socket.current) {
          return;
        }

        const tunnelbrokerSocket = new WebSocket(tunnnelbrokerURL);

        tunnelbrokerSocket.onopen = () => {
          tunnelbrokerSocket.send(JSON.stringify(initMessage));
        };

        tunnelbrokerSocket.onclose = () => {
          // this triggers the effect hook again and reconnect
          setConnected(false);
          onClose?.();
          socket.current = null;
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
              console.log(
                'session with Tunnelbroker created. isAuthorized:',
                isAuthorized,
              );
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
          } else if (
            message.type === tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE
          ) {
            const confirmation: MessageReceiveConfirmation = {
              type: tunnelbrokerMessageTypes.MESSAGE_RECEIVE_CONFIRMATION,
              messageIDs: [message.messageID],
            };

            let rawPeerToPeerMessage;
            try {
              rawPeerToPeerMessage = JSON.parse(message.payload);
            } catch (e) {
              console.log(
                'error while parsing Tunnelbroker peer-to-peer message:',
                e.message,
              );
              // Client received incorrect message, confirm to remove from
              // Tunnelbroker queue.
              socket.current?.send(JSON.stringify(confirmation));
              return;
            }

            if (!peerToPeerMessageValidator.is(rawPeerToPeerMessage)) {
              console.log('invalid Tunnelbroker PeerToPeerMessage');
              // The client received an invalid Tunnelbroker message,
              // and cannot process this type of request.
              socket.current?.send(JSON.stringify(confirmation));
              return;
            }
            const peerToPeerMessage: PeerToPeerMessage = rawPeerToPeerMessage;
            currentlyProcessedMessage.current = (async () => {
              const localSocketSessionCounter = socketSessionCounter.current;
              await currentlyProcessedMessage.current;
              // Since scheduling processing this message socket is closed
              // or was closed and reopened, we have to stop processing
              // because Tunnelbroker flushes the message again when opening
              // the socket, and we want to process this only once
              // to maintain order.
              if (
                localSocketSessionCounter !== socketSessionCounter.current ||
                !socket.current
              ) {
                return;
              }
              try {
                await peerToPeerMessageHandler(
                  peerToPeerMessage,
                  identityClient,
                  message.messageID,
                );
              } catch (e) {
                console.log(e.message);
              } finally {
                // We confirm regardless of success or error while processing.
                socket.current?.send(JSON.stringify(confirmation));
              }
            })();
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
        socketSessionCounter.current = socketSessionCounter.current + 1;
      } catch (err) {
        console.log('Tunnelbroker connection error:', err);
      }
    })();
  }, [
    connected,
    isSocketActive,
    isAuthorized,
    resetHeartbeatTimeout,
    stopHeartbeatTimeout,
    identityClient,
    onClose,
    createInitMessage,
  ]);

  const sendMessageToDeviceRequest: (
    request: MessageToDeviceRequest,
  ) => Promise<void> = React.useCallback(
    request => {
      return new Promise((resolve, reject) => {
        const socketActive = connected && socket.current;
        if (!shouldBeClosed && !socketActive) {
          throw new Error('Tunnelbroker not connected');
        }
        promises.current[request.clientMessageID] = {
          resolve,
          reject,
        };
        if (socketActive) {
          socket.current?.send(JSON.stringify(request));
        } else {
          secondaryTunnelbrokerConnection?.sendMessage(request);
        }
      });
    },
    [connected, secondaryTunnelbrokerConnection, shouldBeClosed],
  );

  const sendMessage: (message: ClientMessageToDevice) => Promise<void> =
    React.useCallback(
      (message: ClientMessageToDevice) => {
        const clientMessageID = uuid.v4();
        const messageToDevice: MessageToDeviceRequest = {
          type: tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE_REQUEST,
          clientMessageID,
          deviceID: message.deviceID,
          payload: message.payload,
        };

        return sendMessageToDeviceRequest(messageToDevice);
      },
      [sendMessageToDeviceRequest],
    );

  React.useEffect(
    () =>
      secondaryTunnelbrokerConnection?.onSendMessage(message => {
        if (shouldBeClosed) {
          // We aren't supposed to be handling it
          return;
        }

        void (async () => {
          try {
            await sendMessageToDeviceRequest(message);
            secondaryTunnelbrokerConnection.setMessageStatus(
              message.clientMessageID,
            );
          } catch (error) {
            secondaryTunnelbrokerConnection.setMessageStatus(
              message.clientMessageID,
              error,
            );
          }
        })();
      }),
    [
      secondaryTunnelbrokerConnection,
      sendMessageToDeviceRequest,
      shouldBeClosed,
    ],
  );

  React.useEffect(
    () =>
      secondaryTunnelbrokerConnection?.onMessageStatus((messageID, error) => {
        if (error) {
          promises.current[messageID].reject(error);
        } else {
          promises.current[messageID].resolve();
        }
        delete promises.current[messageID];
      }),
    [secondaryTunnelbrokerConnection],
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
      isAuthorized,
      addListener,
      removeListener,
      setUnauthorizedDeviceID,
    }),
    [addListener, connected, removeListener, sendMessage, isAuthorized],
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

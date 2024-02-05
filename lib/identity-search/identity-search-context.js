// @flow

import invariant from 'invariant';
import * as React from 'react';

import { identitySearchURL } from '../facts/identity-search.js';
import { identitySearchHeartbeatTimeout } from '../shared/timeouts.js';
import type { IdentitySearchAuthMessage } from '../types/identity-search/auth-message-types.js';
import {
  type IdentitySearchMessageToClient,
  identitySearchMessageToClientTypes,
  identitySearchMessageToServerTypes,
  identitySearchMessageToClientValidator,
} from '../types/identity-search/messages.js';
import type { Heartbeat } from '../types/websocket/heartbeat-types.js';

export type IdentitySearchSocketListener = (
  message: IdentitySearchMessageToClient,
) => mixed;

type IdentitySearchContextType = {
  +addListener: (listener: IdentitySearchSocketListener) => void,
  +removeListener: (listener: IdentitySearchSocketListener) => void,
  +connected: boolean,
};

const IdentitySearchContext: React.Context<?IdentitySearchContextType> =
  React.createContext<?IdentitySearchContextType>();

type Props = {
  +children: React.Node,
  +getIdentitySearchAuthMessage: () => Promise<IdentitySearchAuthMessage>,
};

function IdentitySearchProvider(props: Props): React.Node {
  const { children, getIdentitySearchAuthMessage } = props;
  const [connected, setConnected] = React.useState(false);
  const [identitySearchAuthMessage, setIdentitySearchAuthMessage] =
    React.useState<?IdentitySearchAuthMessage>(null);
  const listeners = React.useRef<Set<IdentitySearchSocketListener>>(new Set());
  const socket = React.useRef<?WebSocket>(null);
  const heartbeatTimeoutID = React.useRef<?TimeoutID>();

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
    }, identitySearchHeartbeatTimeout);
  }, [stopHeartbeatTimeout]);

  React.useEffect(() => {
    const fetchAuthMessage = async () => {
      const authMessage = await getIdentitySearchAuthMessage();
      setIdentitySearchAuthMessage(authMessage);
    };

    void fetchAuthMessage();
  }, [getIdentitySearchAuthMessage]);

  React.useEffect(() => {
    if (connected || !identitySearchAuthMessage) {
      return;
    }

    const identitySearchSocket = new WebSocket(identitySearchURL);

    identitySearchSocket.onopen = () => {
      identitySearchSocket.send(JSON.stringify(identitySearchAuthMessage));
    };

    identitySearchSocket.onclose = () => {
      setConnected(false);
    };

    identitySearchSocket.onerror = e => {
      setConnected(false);
      console.log('Identity Search socket error', e.message);
    };

    identitySearchSocket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') {
        console.log('socket received a non-string message');
        return;
      }
      let rawMessage;
      try {
        rawMessage = JSON.parse(event.data);
      } catch (e) {
        console.log('error while parsing Identity Search message:', e.message);
        return;
      }

      if (!identitySearchMessageToClientValidator.is(rawMessage)) {
        console.log('invalid Identity Search message');
        return;
      }

      const message: IdentitySearchMessageToClient = rawMessage;

      resetHeartbeatTimeout();

      for (const listener of listeners.current) {
        listener(message);
      }

      if (
        message.type ===
        identitySearchMessageToClientTypes.CONNECTION_INITIALIZATION_RESPONSE
      ) {
        if (message.status.type === 'Success' && !connected) {
          setConnected(true);
        } else if (message.status.type === 'Success' && connected) {
          console.log(
            'received ConnectionInitializationResponse with status:',
            'Success for already connected socket',
          );
        } else {
          setConnected(false);
          console.log(
            'creating session with Identity Search error:',
            message.status.data,
          );
        }
      } else if (
        message.type === identitySearchMessageToClientTypes.HEARTBEAT
      ) {
        const heartbeat: Heartbeat = {
          type: identitySearchMessageToServerTypes.HEARTBEAT,
        };
        socket.current?.send(JSON.stringify(heartbeat));
      }
    };

    socket.current = identitySearchSocket;
  }, [
    connected,
    identitySearchAuthMessage,
    resetHeartbeatTimeout,
    stopHeartbeatTimeout,
  ]);

  const addListener = React.useCallback(
    (listener: IdentitySearchSocketListener) => {
      listeners.current.add(listener);
    },
    [],
  );

  const removeListener = React.useCallback(
    (listener: IdentitySearchSocketListener) => {
      listeners.current.delete(listener);
    },
    [],
  );

  const value: IdentitySearchContextType = React.useMemo(
    () => ({
      connected,
      addListener,
      removeListener,
    }),
    [connected, addListener, removeListener],
  );

  return (
    <IdentitySearchContext.Provider value={value}>
      {children}
    </IdentitySearchContext.Provider>
  );
}

function useIdentitySearch(): IdentitySearchContextType {
  const context = React.useContext(IdentitySearchContext);
  invariant(context, 'IdentitySearchContext not found');

  return context;
}

export { IdentitySearchProvider, useIdentitySearch };

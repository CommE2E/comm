// @flow

import invariant from 'invariant';
import * as React from 'react';

import { identitySearchURL } from '../facts/identity-search.js';
import { identitySearchHeartbeatTimeout } from '../shared/timeouts.js';
import type { AuthMessage } from '../types/identity-search/auth-message-types.js';
import {
  type IdentitySearchMessage,
  identitySearchMessageTypes,
  identitySearchMessageValidator,
} from '../types/identity-search/messages.js';
import type { Heartbeat } from '../types/websocket/heartbeat-types.js';

export type IdentitySearchSocketListener = (
  message: IdentitySearchMessage,
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
  +authMessage: ?AuthMessage,
};

function IdentitySearchProvider(props: Props): React.Node {
  const { children, authMessage } = props;
  const [connected, setConnected] = React.useState(false);
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
    if (connected || !authMessage) {
      return;
    }

    const identitySearchSocket = new WebSocket(identitySearchURL);

    identitySearchSocket.onopen = () => {
      console.log(authMessage);
      identitySearchSocket.send(JSON.stringify(authMessage));
    };

    identitySearchSocket.onerror = e => {
      setConnected(false);
      console.log('IdentitySearch socket error', e.message);
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
        console.log('error while parsing IdentitySearch message:', e.message);
        return;
      }

      if (!identitySearchMessageValidator.is(rawMessage)) {
        console.log('invalid IdentitySearch message');
        return;
      }

      const message: IdentitySearchMessage = rawMessage;

      resetHeartbeatTimeout();

      for (const listener of listeners.current) {
        listener(message);
      }

      if (
        message.type ===
        identitySearchMessageTypes.CONNECTION_INITIALIZATION_RESPONSE
      ) {
        if (message.status.type === 'Success' && !connected) {
          setConnected(true);
          console.log('session with Identity Search created');
        } else if (message.status.type === 'Success' && connected) {
          console.log(
            'received ConnectionInitializationResponse with status: Success for already connected socket',
          );
        } else {
          setConnected(false);
          console.log(
            'creating session with Identity Search error:',
            message.status.data,
          );
        }
      } else if (message.type === identitySearchMessageTypes.HEARTBEAT) {
        const heartbeat: Heartbeat = {
          type: identitySearchMessageTypes.HEARTBEAT,
        };
        socket.current?.send(JSON.stringify(heartbeat));
      }
    };

    socket.current = identitySearchSocket;
  }, [connected, authMessage, resetHeartbeatTimeout, stopHeartbeatTimeout]);

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

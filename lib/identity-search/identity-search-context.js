// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { identitySearchURL } from '../facts/identity-search.js';
import {
  clientRequestVisualTimeout,
  identitySearchHeartbeatTimeout,
} from '../shared/timeouts.js';
import type { AuthMessage } from '../types/identity-search/auth-message-types.js';
import {
  type IdentitySearchMessageToClient,
  identitySearchMessageToClientTypes,
  identitySearchMessageToClientValidator,
} from '../types/identity-search/messages.js';
import { identitySearchMessageToServerTypes } from '../types/identity-search/messages.js';
import {
  type SearchQuery,
  type Prefix,
} from '../types/identity-search/search-query-types.js';
import {
  type User,
  searchResultValidator,
} from '../types/identity-search/search-response-types.js';
import type { Heartbeat } from '../types/websocket/heartbeat-types.js';
import sleep from '../utils/sleep.js';

export type IdentitySearchSocketListener = (
  message: IdentitySearchMessageToClient,
) => mixed;

type PromiseCallbacks = {
  +resolve: (hits: $ReadOnlyArray<User>) => void,
  +reject: (error: string) => void,
};
type Promises = { [queryID: string]: PromiseCallbacks };

type IdentitySearchContextType = {
  +sendPrefixQuery: (prefix_query: string) => mixed,
  +addListener: (listener: IdentitySearchSocketListener) => mixed,
  +removeListener: (listener: IdentitySearchSocketListener) => mixed,
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
  const promises = React.useRef<Promises>({});
  const heartbeatTimeoutID = React.useRef<?TimeoutID>();

  const previousAuthMessage = React.useRef<?AuthMessage>(authMessage);
  const authMessageChanged = authMessage !== previousAuthMessage.current;
  previousAuthMessage.current = authMessage;

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

  const isSocketActive =
    socket.current?.readyState === WebSocket.OPEN ||
    socket.current?.readyState === WebSocket.CONNECTING;

  React.useEffect(() => {
    if ((!authMessage || authMessageChanged) && isSocketActive) {
      socket.current?.close();
      return;
    }

    if (connected || !authMessage) {
      return;
    }

    const identitySearchSocket = new WebSocket(identitySearchURL);

    identitySearchSocket.onopen = () => {
      identitySearchSocket.send(JSON.stringify(authMessage));
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
            'received ConnectionInitializationResponse with status: Success for already connected socket',
          );
        } else {
          setConnected(false);
          console.log(
            'creating session with Identity Search error:',
            message.status.data,
          );
        }
      } else if (
        message.type === identitySearchMessageToClientTypes.SUCCESS ||
        message.type === identitySearchMessageToClientTypes.ERROR
      ) {
        if (!searchResultValidator.is(message)) {
          return;
        }
        if (message.type === identitySearchMessageToClientTypes.SUCCESS) {
          promises.current[message.data.id]?.resolve(message.data.hits);
          delete promises.current[message.data.id];
        } else {
          promises.current[message.data.id]?.reject(message.data.error);
          delete promises.current[message.data.id];
        }
      } else if (
        message.type === identitySearchMessageToClientTypes.HEARTBEAT
      ) {
        const heartbeat: Heartbeat = {
          type: identitySearchMessageToClientTypes.HEARTBEAT,
        };
        socket.current?.send(JSON.stringify(heartbeat));
      }
    };

    socket.current = identitySearchSocket;
  }, [
    connected,
    authMessage,
    resetHeartbeatTimeout,
    stopHeartbeatTimeout,
    authMessageChanged,
    isSocketActive,
  ]);

  const sendPrefixQuery: (usernamePrefix: string) => mixed = React.useCallback(
    (usernamePrefix: string) => {
      invariant(
        connected && socket.current,
        'Identity Search socket not connected for query',
      );

      const queryID = uuid.v4();
      const prefixQuery: Prefix = {
        type: identitySearchMessageToServerTypes.PREFIX,
        prefix: usernamePrefix,
      };

      const searchQuery: SearchQuery = {
        type: identitySearchMessageToServerTypes.SEARCH_QUERY,
        id: queryID,
        searchMethod: prefixQuery,
      };

      const requestPromise: Promise<mixed> = new Promise((resolve, reject) => {
        promises.current[queryID] = { resolve, reject };
        socket.current?.send(JSON.stringify(searchQuery));
      });

      const timeoutPromise: Promise<void> = sleep(
        clientRequestVisualTimeout,
      ).then(() => {
        if (promises.current[queryID]) {
          promises.current[queryID].reject('Request timed out');
          delete promises.current[queryID];
        }
      });

      return Promise.race([requestPromise, timeoutPromise]);
    },
    [connected],
  );

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
      sendPrefixQuery,
      connected,
      addListener,
      removeListener,
    }),
    [connected, addListener, removeListener, sendPrefixQuery],
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

// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { useInvalidCSATLogOut } from '../actions/user-actions.js';
import { identitySearchURL } from '../facts/identity-search.js';
import {
  clientRequestVisualTimeout,
  identitySearchHeartbeatTimeout,
} from '../shared/timeouts.js';
import type { IdentitySearchAuthMessage } from '../types/identity-search/auth-message-types.js';
import {
  type IdentitySearchMessageToClient,
  identitySearchMessageToClientTypes,
  identitySearchMessageToServerTypes,
  identitySearchMessageToClientValidator,
} from '../types/identity-search/messages.js';
import {
  type IdentitySearchQuery,
  type IdentitySearchPrefix,
} from '../types/identity-search/search-query-types.js';
import {
  type IdentitySearchUser,
  identitySearchResponseValidator,
} from '../types/identity-search/search-response-types.js';
import type { Heartbeat } from '../types/websocket/heartbeat-types.js';
import { useGetIdentitySearchAuthMessage } from '../utils/identity-search-utils.js';
import sleep from '../utils/sleep.js';

export type IdentitySearchSocketListener = (
  message: IdentitySearchMessageToClient,
) => mixed;

type PromiseCallbacks = {
  +resolve: (hits: $ReadOnlyArray<IdentitySearchUser>) => void,
  +reject: (error: string) => void,
};
type Promises = { [queryID: string]: PromiseCallbacks };

type IdentitySearchContextType = {
  +sendPrefixQuery: (
    usernamePrefix: string,
  ) => Promise<$ReadOnlyArray<IdentitySearchUser>>,
  +addListener: (listener: IdentitySearchSocketListener) => mixed,
  +removeListener: (listener: IdentitySearchSocketListener) => mixed,
  +connected: boolean,
};

const timeout = async (): Promise<$ReadOnlyArray<IdentitySearchUser>> => {
  await sleep(clientRequestVisualTimeout);
  throw new Error('search request timed out');
};

const IdentitySearchContext: React.Context<?IdentitySearchContextType> =
  React.createContext<?IdentitySearchContextType>();

type Props = {
  +children: React.Node,
};

function IdentitySearchProvider(props: Props): React.Node {
  const { children } = props;
  const [connected, setConnected] = React.useState(false);
  const listeners = React.useRef<Set<IdentitySearchSocketListener>>(new Set());
  const getIdentitySearchAuthMessage = useGetIdentitySearchAuthMessage();
  const invalidTokenLogOut = useInvalidCSATLogOut();
  const [identitySearchAuthMessage, setIdentitySearchAuthMessage] =
    React.useState<?IdentitySearchAuthMessage>(null);
  const socket = React.useRef<?WebSocket>(null);
  const promises = React.useRef<Promises>({});
  const heartbeatTimeoutID = React.useRef<?TimeoutID>();

  const previousAuthMessage = React.useRef<?IdentitySearchAuthMessage>(
    identitySearchAuthMessage,
  );

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
    void (async () => {
      const newAuthMessage = await getIdentitySearchAuthMessage();
      setIdentitySearchAuthMessage(newAuthMessage);
    })();
  }, [getIdentitySearchAuthMessage]);

  React.useEffect(() => {
    const isSocketActive =
      socket.current?.readyState === WebSocket.OPEN ||
      socket.current?.readyState === WebSocket.CONNECTING;

    const identitySearchAuthMessageChanged =
      identitySearchAuthMessage !== previousAuthMessage.current;
    previousAuthMessage.current = identitySearchAuthMessage;

    if (
      (!identitySearchAuthMessage || identitySearchAuthMessageChanged) &&
      isSocketActive &&
      socket.current
    ) {
      socket.current?.close();
      return;
    }

    if (connected || !identitySearchAuthMessage || socket.current) {
      return;
    }

    const identitySearchSocket = new WebSocket(identitySearchURL);

    identitySearchSocket.onopen = () => {
      identitySearchSocket.send(JSON.stringify(identitySearchAuthMessage));
    };

    identitySearchSocket.onclose = () => {
      setConnected(false);
      socket.current = null;
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
          if (message.status.data?.includes('UnauthorizedDevice')) {
            void invalidTokenLogOut();
            return;
          }
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
        if (!identitySearchResponseValidator.is(message)) {
          console.log('Invalid search response message');
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
          type: identitySearchMessageToServerTypes.HEARTBEAT,
        };
        identitySearchSocket.send(JSON.stringify(heartbeat));
      }
    };

    socket.current = identitySearchSocket;
  }, [
    connected,
    identitySearchAuthMessage,
    resetHeartbeatTimeout,
    stopHeartbeatTimeout,
    invalidTokenLogOut,
  ]);

  const sendPrefixQuery: (
    usernamePrefix: string,
  ) => Promise<$ReadOnlyArray<IdentitySearchUser>> = React.useCallback(
    (usernamePrefix: string) => {
      if (!connected || !socket.current) {
        return Promise.reject(new Error('Socket is not connected'));
      }

      const queryID = uuid.v4();
      const prefixQuery: IdentitySearchPrefix = {
        type: identitySearchMessageToServerTypes.IDENTITY_SEARCH_PREFIX,
        prefix: usernamePrefix,
      };

      const searchQuery: IdentitySearchQuery = {
        type: identitySearchMessageToServerTypes.IDENTITY_SEARCH_QUERY,
        id: queryID,
        searchMethod: prefixQuery,
      };

      const requestPromise: Promise<$ReadOnlyArray<IdentitySearchUser>> =
        new Promise((resolve, reject) => {
          promises.current[queryID] = { resolve, reject };
        });

      socket.current?.send(JSON.stringify(searchQuery));

      return Promise.race([requestPromise, timeout()]);
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

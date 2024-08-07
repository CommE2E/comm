// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import {
  createOlmSessionWithPeer,
  type SessionCreationOptions,
} from '../utils/crypto-utils.js';

export type PeerOlmSessionCreatorContextType = {
  +createOlmSessionsWithPeer: (
    userID: string,
    deviceID: string,
    sessionCreationOptions?: SessionCreationOptions,
  ) => Promise<void>,
};

const PeerOlmSessionCreatorContext: React.Context<?PeerOlmSessionCreatorContextType> =
  React.createContext<?PeerOlmSessionCreatorContextType>();

type Props = {
  +children: React.Node,
};
function PeerOlmSessionCreatorProvider(props: Props): React.Node {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  const { sendMessageToDevice } = useTunnelbroker();

  const runningPromises = React.useRef<{
    [userID: string]: { [deviceID: string]: ?Promise<void> },
  }>({});

  const createOlmSessionsWithPeer = React.useCallback(
    (
      userID: string,
      deviceID: string,
      sessionCreationOptions?: SessionCreationOptions,
    ) => {
      if (
        runningPromises.current[userID] &&
        runningPromises.current[userID][deviceID]
      ) {
        return runningPromises.current[userID][deviceID];
      }

      const promise = (async () => {
        const authMetadata = await getAuthMetadata();
        await createOlmSessionWithPeer(
          authMetadata,
          identityClient,
          sendMessageToDevice,
          userID,
          deviceID,
          sessionCreationOptions,
        );

        runningPromises.current[userID][deviceID] = null;
      })();

      if (!runningPromises.current[userID]) {
        runningPromises.current[userID] = {};
      }

      runningPromises.current[userID][deviceID] = promise;
      return promise;
    },
    [identityClient, sendMessageToDevice, getAuthMetadata],
  );

  const peerOlmSessionCreatorContextValue: PeerOlmSessionCreatorContextType =
    React.useMemo(
      () => ({ createOlmSessionsWithPeer }),
      [createOlmSessionsWithPeer],
    );

  return (
    <PeerOlmSessionCreatorContext.Provider
      value={peerOlmSessionCreatorContextValue}
    >
      {props.children}
    </PeerOlmSessionCreatorContext.Provider>
  );
}

function usePeerOlmSessionsCreatorContext(): PeerOlmSessionCreatorContextType {
  const context = React.useContext(PeerOlmSessionCreatorContext);
  invariant(context, 'PeerOlmSessionsCreatorContext should be set');
  return context;
}

export { PeerOlmSessionCreatorProvider, usePeerOlmSessionsCreatorContext };

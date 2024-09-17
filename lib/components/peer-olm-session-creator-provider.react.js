// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import {
  createOlmSessionsWithUser,
  type DeviceSessionCreationRequest,
} from '../utils/crypto-utils.js';

export type PeerOlmSessionCreatorContextType = {
  +createOlmSessionsWithUser: (
    userID: string,
    devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
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

  const createOlmSessionsWithUserCallback = React.useCallback(
    async (
      userID: string,
      devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
    ) => {
      if (!runningPromises.current[userID]) {
        runningPromises.current[userID] = {};
      }

      const filteredDevices = devices.filter(
        request => !runningPromises.current[userID][request.deviceID],
      );

      const promise = (async () => {
        const authMetadata = await getAuthMetadata();
        await createOlmSessionsWithUser(
          authMetadata,
          identityClient,
          sendMessageToDevice,
          userID,
          filteredDevices,
        );

        for (const request of filteredDevices) {
          runningPromises.current[userID][request.deviceID] = null;
        }
      })();

      for (const request of filteredDevices) {
        runningPromises.current[userID][request.deviceID] = promise;
      }

      const promises = [];
      for (const request of devices) {
        if (runningPromises.current[userID][request.deviceID]) {
          promises.push(runningPromises.current[userID][request.deviceID]);
        }
      }

      await Promise.all(promises);
    },
    [identityClient, sendMessageToDevice, getAuthMetadata],
  );

  const peerOlmSessionCreatorContextValue: PeerOlmSessionCreatorContextType =
    React.useMemo(
      () => ({
        createOlmSessionsWithUser: createOlmSessionsWithUserCallback,
      }),
      [createOlmSessionsWithUserCallback],
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

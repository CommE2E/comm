// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useOlmDebugLogs } from './debug-logs-context.js';
import { getPeersDeadDeviceIDs } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import {
  createOlmSessionsWithUser,
  type DeviceSessionCreationRequest,
} from '../utils/crypto-utils.js';
import { useSelector } from '../utils/redux-utils.js';

export type CreateOlmSessionsWithUser = (
  userID: string,
  devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
  source: 'session_reset' | 'session_not_exists',
) => Promise<void>;

export type PeerOlmSessionCreatorContextType = {
  +createOlmSessionsWithUser: CreateOlmSessionsWithUser,
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

  const olmDebugLog = useOlmDebugLogs();

  const deadDevices = useSelector(getPeersDeadDeviceIDs);

  const createOlmSessionsWithUserCallback = React.useCallback(
    async (
      userID: string,
      devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
      source: 'session_reset' | 'session_not_exists',
    ) => {
      if (!runningPromises.current[userID]) {
        runningPromises.current[userID] = {};
      }

      const filteredDevices = devices.filter(
        request =>
          !runningPromises.current[userID][request.deviceID] &&
          !deadDevices.has(request.deviceID),
      );

      const promise = (async () => {
        const authMetadata = await getAuthMetadata();
        await createOlmSessionsWithUser(
          authMetadata,
          identityClient,
          sendMessageToDevice,
          userID,
          filteredDevices,
          source,
          olmDebugLog,
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
    [
      deadDevices,
      getAuthMetadata,
      identityClient,
      olmDebugLog,
      sendMessageToDevice,
    ],
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

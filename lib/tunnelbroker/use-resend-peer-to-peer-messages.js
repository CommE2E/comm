// @flow

import * as React from 'react';

import { usePeerToPeerCommunication } from './peer-to-peer-context.js';
import type { PrimaryDeviceChange } from '../hooks/peer-list-hooks.js';
import { getConfig } from '../utils/config.js';

function useResendPeerToPeerMessages(): (
  deviceID: string,
  newDeviceID?: ?string,
) => Promise<void> {
  const { sqliteAPI } = getConfig();
  const { processOutboundMessages } = usePeerToPeerCommunication();

  return React.useCallback(
    async (deviceID: string, newDeviceID?: ?string) => {
      const messageIDs = await sqliteAPI.resetOutboundP2PMessagesForDevice(
        deviceID,
        newDeviceID,
      );
      processOutboundMessages(messageIDs);
    },
    [processOutboundMessages, sqliteAPI],
  );
}

function useResendP2PMessagesToNewPrimaryDevices(): (
  primaryDeviceChanges: $ReadOnlyArray<PrimaryDeviceChange>,
) => Promise<void> {
  const resendPeerToPeerMessages = useResendPeerToPeerMessages();

  return React.useCallback(
    async (primaryDeviceChanges: $ReadOnlyArray<PrimaryDeviceChange>) => {
      const promises = primaryDeviceChanges.map(
        ({ prevPrimaryDeviceID, newPrimaryDeviceID }) =>
          resendPeerToPeerMessages(prevPrimaryDeviceID, newPrimaryDeviceID),
      );
      await Promise.all(promises);
    },
    [resendPeerToPeerMessages],
  );
}

export { useResendPeerToPeerMessages, useResendP2PMessagesToNewPrimaryDevices };

// @flow

import * as React from 'react';

import { usePeerToPeerCommunication } from './peer-to-peer-context.js';
import { useOlmDebugLogs } from '../components/debug-logs-context.js';
import type { PrimaryDeviceChange } from '../hooks/peer-list-hooks.js';
import { getConfig } from '../utils/config.js';

function useResendPeerToPeerMessages(): (
  deviceID: string,
  newDeviceID?: ?string,
) => Promise<void> {
  const { sqliteAPI } = getConfig();
  const { processOutboundMessages } = usePeerToPeerCommunication();
  const olmDebugLog = useOlmDebugLogs();

  return React.useCallback(
    async (deviceID: string, newDeviceID?: ?string) => {
      try {
        const messageIDs = await sqliteAPI.resetOutboundP2PMessagesForDevice(
          deviceID,
          newDeviceID,
        );

        olmDebugLog({
          operation: 'resendPeerToPeerMessages',
          deviceID,
          newDeviceID,
          messageCount: messageIDs.length,
          success: true,
          resultDescription: `Resent ${messageIDs.length} messages for device ${deviceID}`,
        });

        processOutboundMessages(messageIDs);
      } catch (error) {
        olmDebugLog({
          operation: 'resendPeerToPeerMessages',
          deviceID,
          newDeviceID,
          messageCount: 0,
          success: false,
          resultDescription: `Failed to resent messages for device ${deviceID}: ${error.message}`,
        });
        throw error;
      }
    },
    [processOutboundMessages, sqliteAPI, olmDebugLog],
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

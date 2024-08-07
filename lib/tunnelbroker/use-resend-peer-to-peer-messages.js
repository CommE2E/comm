// @flow

import * as React from 'react';

import { usePeerToPeerCommunication } from './peer-to-peer-context.js';
import { getConfig } from '../utils/config.js';

function useResendPeerToPeerMessages(): (deviceID: string) => Promise<void> {
  const { sqliteAPI } = getConfig();
  const { processOutboundMessages } = usePeerToPeerCommunication();

  return React.useCallback(
    async (deviceID: string) => {
      const messageIDs =
        await sqliteAPI.resetOutboundP2PMessagesForDevice(deviceID);
      processOutboundMessages(messageIDs);
    },
    [processOutboundMessages, sqliteAPI],
  );
}

export { useResendPeerToPeerMessages };

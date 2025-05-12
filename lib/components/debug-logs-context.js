// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { OlmEncryptedMessageTypes } from '../types/crypto-types.js';
import { type OutboundP2PMessageStatuses } from '../types/sqlite-types.js';

export type DebugLog = {
  +title: string,
  +message: string,
  +timestamp: number,
};

export type DebugLogsContextType = {
  +logs: $ReadOnlyArray<DebugLog>,
  +addLog: (title: string, message: string) => mixed,
  +clearLogs: () => mixed,
};

const DebugLogsContext: React.Context<DebugLogsContextType> =
  React.createContext<DebugLogsContextType>({
    logs: [],
    addLog: () => {},
    clearLogs: () => {},
  });

function useDebugLogs(): DebugLogsContextType {
  const debugLogsContext = React.useContext(DebugLogsContext);
  invariant(debugLogsContext, 'Debug logs context should be present');
  return debugLogsContext;
}

// The other party included in the operation
type Peer = {
  +userID: string,
  +deviceID: string,
};

// Only the part that is helpful for debugging
type LogEncryptedData = {
  +messageType: OlmEncryptedMessageTypes,
  +sessionVersion?: number,
};

export type OlmDebugLog =
  | {
      +operation: 'decryptAndPersist',
      +messageID: string,
      +peer: Peer,
      +encryptedData: LogEncryptedData,
      +decryptedData: {
        +type: string,
        +dmOpData?: {
          +type?: string,
          +messageID?: string,
          +targetMessageID?: string,
          +sourceMessageID?: string,
        },
      },
      +success: boolean,
      +resultDescription: string,
    }
  | {
      +operation: 'encryptAndPersist',
      +messageID: string,
      +peer: Peer,
      +status: OutboundP2PMessageStatuses,
      +supportsAutoRetry: boolean,
      +success: boolean,
      +resultDescription: string,
    }
  | {
      +operation: 'ephemeralEncrypt',
      +messageID: string,
      +peer: Peer,
      +success: boolean,
      +resultDescription: string,
    }
  | {
      +operation: 'sendingAlreadyEncryptedMessage',
      +messageID: string,
      +peer: Peer,
      +status: OutboundP2PMessageStatuses,
      +supportsAutoRetry: boolean,
    }
  | {
      +operation: 'contentInboundSessionCreator',
      +peer: Peer,
      +encryptedData: LogEncryptedData,
      +success: boolean,
      +resultDescription: string,
    }
  | {
      +operation: 'contentOutboundSessionCreator',
      +peer: Peer,
      +sessionVersion: number,
      +success: boolean,
      +resultDescription: string,
    }
  | {
      +operation: 'uploadOneTimeKeys',
      +success: boolean,
      +resultDescription: string,
    };

function useOlmDebugLogs(): (olmLog: OlmDebugLog) => mixed {
  const { addLog } = useDebugLogs();
  return React.useCallback(
    (olmLog: OlmDebugLog) => addLog('Olm LOG', JSON.stringify(olmLog)),
    [addLog],
  );
}

export { DebugLogsContext, useDebugLogs, useOlmDebugLogs };

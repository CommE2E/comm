// @flow

import invariant from 'invariant';
import * as React from 'react';

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

export { DebugLogsContext, useDebugLogs };

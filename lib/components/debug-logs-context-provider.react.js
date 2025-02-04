// @flow

import * as React from 'react';

import { type DebugLog, DebugLogsContext } from './debug-logs-context.js';

type Props = {
  +children: React.Node,
};

function DebugLogsContextProvider(props: Props): React.Node {
  const [logs, setLogs] = React.useState<$ReadOnlyArray<DebugLog>>([]);

  const addLog = React.useCallback(
    (title: string, message: string) =>
      setLogs(prevLogs => [
        ...prevLogs,
        {
          title,
          message,
          timestamp: Date.now(),
        },
      ]),
    [],
  );

  const clearLogs = React.useCallback(() => setLogs([]), []);

  const contextValue = React.useMemo(
    () => ({
      logs,
      addLog,
      clearLogs,
    }),
    [addLog, clearLogs, logs],
  );

  return (
    <DebugLogsContext.Provider value={contextValue}>
      {props.children}
    </DebugLogsContext.Provider>
  );
}

export { DebugLogsContextProvider };

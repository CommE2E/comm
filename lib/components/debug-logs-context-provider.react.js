// @flow

import * as React from 'react';

import { type DebugLog, DebugLogsContext } from './debug-logs-context.js';
import { useIsCurrentUserStaff } from '../shared/staff-utils.js';
import { isDev } from '../utils/dev-utils.js';

type Props = {
  +children: React.Node,
};

function DebugLogsContextProvider(props: Props): React.Node {
  const [logs, setLogs] = React.useState<$ReadOnlyArray<DebugLog>>([]);
  const isCurrentUserStaff = useIsCurrentUserStaff();

  const addLog = React.useCallback(
    (title: string, message: string) => {
      console.log(`${title}: ${message}`);

      if (!isCurrentUserStaff && !isDev) {
        return;
      }

      setLogs(prevLogs => [
        ...prevLogs,
        {
          title,
          message,
          timestamp: Date.now(),
        },
      ]);
    },
    [isCurrentUserStaff],
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

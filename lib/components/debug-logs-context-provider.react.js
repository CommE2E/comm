// @flow

import * as React from 'react';

import {
  type DebugLog,
  DebugLogsContext,
  defaultLogsFilter,
  type LogType,
} from './debug-logs-context.js';
import { useIsCurrentUserStaff } from '../shared/staff-utils.js';
import { isDev } from '../utils/dev-utils.js';

type Props = {
  +children: React.Node,
};

function DebugLogsContextProvider(props: Props): React.Node {
  const [logs, setLogs] = React.useState<$ReadOnlyArray<DebugLog>>([]);
  const [logsFilter, setLogsFilter] =
    React.useState<$ReadOnlySet<LogType>>(defaultLogsFilter);
  const isCurrentUserStaff = useIsCurrentUserStaff();

  const addLog = React.useCallback(
    (title: string, message: string, logTypes: $ReadOnlySet<LogType>) => {
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
          logTypes,
        },
      ]);
    },
    [isCurrentUserStaff],
  );

  const isLogEnabled = React.useCallback(
    (log: DebugLog) =>
      [...log.logTypes].find(logType => logsFilter.has(logType)),
    [logsFilter],
  );

  const clearLogs = React.useCallback(
    () => setLogs(prev => prev.filter(log => !isLogEnabled(log))),
    [isLogEnabled],
  );

  const filteredLogs = React.useMemo(
    () => logs.filter(isLogEnabled),
    [isLogEnabled, logs],
  );

  const setFilter = React.useCallback(
    (logType: LogType, value: boolean) =>
      setLogsFilter(prev => {
        const newFilters = new Set(prev);
        if (value) {
          newFilters.add(logType);
        } else {
          newFilters.delete(logType);
        }
        return newFilters;
      }),
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      logsFilter,
      logs: filteredLogs,
      addLog,
      clearLogs,
      setFilter,
    }),
    [addLog, clearLogs, filteredLogs, logsFilter, setFilter],
  );

  return (
    <DebugLogsContext.Provider value={contextValue}>
      {props.children}
    </DebugLogsContext.Provider>
  );
}

export { DebugLogsContextProvider };

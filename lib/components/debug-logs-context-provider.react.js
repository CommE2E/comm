// @flow

import * as React from 'react';

import {
  type DebugLog,
  DebugLogsContext,
  defaultLosFilter,
  type LogType,
  logTypes,
} from './debug-logs-context.js';
import { useIsCurrentUserStaff } from '../shared/staff-utils.js';
import { isDev } from '../utils/dev-utils.js';

type Props = {
  +children: React.Node,
};

function DebugLogsContextProvider(props: Props): React.Node {
  const [logs, setLogs] = React.useState<$ReadOnlyArray<DebugLog>>([]);
  const [logsFilter, setLogsFilter] =
    React.useState<$ReadOnlyMap<LogType, boolean>>(defaultLosFilter);
  const isCurrentUserStaff = useIsCurrentUserStaff();

  const addLog = React.useCallback(
    (title: string, message: string, types: $ReadOnlyArray<LogType>) => {
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
          logTypes: types,
        },
      ]);
    },
    [isCurrentUserStaff],
  );

  const isLogEnabled = React.useCallback(
    (log: DebugLog) => log.logTypes.find(logType => logsFilter.get(logType)),
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
        const newFilters = new Map(prev);
        newFilters.set(logType, value);
        return newFilters;
      }),
    [],
  );

  const errorLogsNumber = React.useMemo(
    () => logs.filter(log => log.logTypes.includes(logTypes.ERROR)).length,
    [logs],
  );

  const contextValue = React.useMemo(
    () => ({
      logsFilter,
      logs: filteredLogs,
      errorLogsNumber,
      addLog,
      clearLogs,
      setFilter,
    }),
    [addLog, clearLogs, errorLogsNumber, filteredLogs, logsFilter, setFilter],
  );

  return (
    <DebugLogsContext.Provider value={contextValue}>
      {props.children}
    </DebugLogsContext.Provider>
  );
}

export { DebugLogsContextProvider };

// @flow

import * as React from 'react';

import { type DebugLog, DebugLogsContext } from './debug-logs-context.js';
import { useIsCurrentUserStaff, useStaffAlert } from '../shared/staff-utils.js';
import { isWebPlatform } from '../types/device-types.js';
import { getConfig } from '../utils/config.js';
import { isDev } from '../utils/dev-utils.js';

type Props = {
  +children: React.Node,
};

function DebugLogsContextProvider(props: Props): React.Node {
  const [logs, setLogs] = React.useState<$ReadOnlyArray<DebugLog>>([]);
  const isCurrentUserStaff = useIsCurrentUserStaff();
  const { showAlertToStaff } = useStaffAlert();

  const addLog = React.useCallback(
    (title: string, message: string) => {
      if (!isCurrentUserStaff && !isDev) {
        return;
      }
      if (isWebPlatform(getConfig().platformDetails.platform)) {
        showAlertToStaff(title, message);
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
    [isCurrentUserStaff, showAlertToStaff],
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

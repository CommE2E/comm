// @flow

import invariant from 'invariant';
import * as React from 'react';

export type BackupHandlerContextType = {
  +scheduleBackup: () => mixed,
};

const BackupHandlerContext: React.Context<BackupHandlerContextType> =
  React.createContext<BackupHandlerContextType>({
    scheduleBackup: () => {},
  });

function useScheduleBackup(): () => mixed {
  const context = React.useContext(BackupHandlerContext);
  invariant(context, 'BackupHandlerContext should be present');
  return context.scheduleBackup;
}

export { useScheduleBackup, BackupHandlerContext };

// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useUserDataRestore } from './use-user-data-restore.js';
import type { IdentityAuthResult } from '../types/identity-service-types.js';
import type { QRAuthBackupData } from '../types/tunnelbroker/qr-code-auth-message-types.js';

type UserDataRestoreContextType = {
  +restoreUserData: (
    backupData: ?QRAuthBackupData,
    identityAuthResult: ?IdentityAuthResult,
  ) => Promise<void>,
  +isRestoring: boolean,
};

const UserDataRestoreContext: React.Context<?UserDataRestoreContextType> =
  React.createContext<?UserDataRestoreContextType>(null);

type Props = {
  +children: React.Node,
};

function UserDataRestoreProvider(props: Props): React.Node {
  const { children } = props;
  const restorePromiseRef = React.useRef<?Promise<void>>(null);
  const userDataRestore = useUserDataRestore();

  const restoreUserData = React.useCallback(
    async (
      backupData: ?QRAuthBackupData,
      identityAuthResult: ?IdentityAuthResult,
    ): Promise<void> => {
      if (restorePromiseRef.current) {
        return restorePromiseRef.current;
      }

      const promise = (async () => {
        try {
          await userDataRestore(backupData, identityAuthResult);
        } finally {
          restorePromiseRef.current = null;
        }
      })();

      restorePromiseRef.current = promise;
      return promise;
    },
    [userDataRestore],
  );

  const contextValue: UserDataRestoreContextType = React.useMemo(
    () => ({
      restoreUserData,
      isRestoring: restorePromiseRef.current !== null,
    }),
    [restoreUserData],
  );

  return (
    <UserDataRestoreContext.Provider value={contextValue}>
      {children}
    </UserDataRestoreContext.Provider>
  );
}

function useUserDataRestoreContext(): UserDataRestoreContextType {
  const userDataRestoreContext = React.useContext(UserDataRestoreContext);
  invariant(userDataRestoreContext, 'userDataRestoreContext should be set');
  return userDataRestoreContext;
}

export { UserDataRestoreProvider, useUserDataRestoreContext };

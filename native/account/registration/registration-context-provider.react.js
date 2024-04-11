// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types';

import { RegistrationContext } from './registration-context.js';
import { useRegistrationServerCall } from './registration-server-call.js';
import type { CachedUserSelections } from './registration-types.js';
import { commCoreModule } from '../../native-modules.js';
import { useSelector } from '../../redux/redux-utils.js';
import Alert from '../../utils/alert.js';

const emptyObj: CachedUserSelections = Object.freeze({});

type Props = {
  +children: React.Node,
};
function RegistrationContextProvider(props: Props): React.Node {
  const [cachedSelections, setCachedSelections] =
    React.useState<CachedUserSelections>(emptyObj);

  const [skipEthereumLoginOnce, baseSetSkipEthereumLoginOnce] =
    React.useState<?true>();
  const setSkipEthereumLoginOnce = React.useCallback((skip: boolean) => {
    baseSetSkipEthereumLoginOnce(skip || undefined);
  }, []);
  const [siweBackupSecrets, setSIWEBackupSecrets] =
    React.useState<?SIWEBackupSecrets>(undefined);

  const registrationServerCall = useRegistrationServerCall();
  const contextValue = React.useMemo(
    () => ({
      register: registrationServerCall,
      cachedSelections,
      setCachedSelections,
      skipEthereumLoginOnce,
      setSkipEthereumLoginOnce,
      siweBackupSecrets,
      setSIWEBackupSecrets,
    }),
    [
      registrationServerCall,
      cachedSelections,
      skipEthereumLoginOnce,
      setSkipEthereumLoginOnce,
      siweBackupSecrets,
      setSIWEBackupSecrets,
    ],
  );

  const loggedIn = useSelector(isLoggedIn);
  const persistSIWEBackupSecretsPromise = React.useRef<?Promise<void>>(null);

  React.useEffect(() => {
    if (persistSIWEBackupSecretsPromise.current) {
      return;
    }
    if (!siweBackupSecrets || !loggedIn) {
      return;
    }

    persistSIWEBackupSecretsPromise.current = void (async () => {
      try {
        await commCoreModule.setSIWEBackupSecrets(siweBackupSecrets);
      } catch (e) {
        console.log(e);
        if (__DEV__) {
          Alert.alert(
            'Failed to persist SIWE backup secrets to SQLite.',
            e.message,
          );
        }
      } finally {
        setSIWEBackupSecrets(undefined);
        persistSIWEBackupSecretsPromise.current = null;
      }
    })();
  }, [siweBackupSecrets, loggedIn]);

  React.useEffect(() => {
    if (!loggedIn) {
      setSIWEBackupSecrets(undefined);
    }
  }, [loggedIn]);

  return (
    <RegistrationContext.Provider value={contextValue}>
      {props.children}
    </RegistrationContext.Provider>
  );
}

export { RegistrationContextProvider };

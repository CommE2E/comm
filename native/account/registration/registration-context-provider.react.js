// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types';

import { RegistrationContext } from './registration-context.js';
import { useRegistrationServerCall } from './registration-server-call.js';
import type { CachedUserSelections } from './registration-types.js';
import { commCoreModule } from '../../native-modules.js';
import { useSelector } from '../../redux/redux-utils.js';

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
  const storeLoaded = useSelector(state => state.storeLoaded);
  const loggedIn = useSelector(isLoggedIn);
  const lastPersistedBackupSecret = React.useRef<?SIWEBackupSecrets>(undefined);

  React.useEffect(() => {
    void (async () => {
      if (!siweBackupSecrets || !storeLoaded || !loggedIn) {
        return;
      }
      if (lastPersistedBackupSecret.current === siweBackupSecrets) {
        return;
      }
      lastPersistedBackupSecret.current = siweBackupSecrets;
      await commCoreModule.setSIWEBackupSecrets(siweBackupSecrets);
    })();
  }, [storeLoaded, siweBackupSecrets, loggedIn]);

  return (
    <RegistrationContext.Provider value={contextValue}>
      {props.children}
    </RegistrationContext.Provider>
  );
}

export { RegistrationContextProvider };

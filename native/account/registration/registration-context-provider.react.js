// @flow

import * as React from 'react';

import { RegistrationContext } from './registration-context.js';
import { useRegistrationServerCall } from './registration-server-call.js';
import type { CachedUserSelections } from './registration-types.js';

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

  const registrationServerCall = useRegistrationServerCall();
  const contextValue = React.useMemo(
    () => ({
      register: registrationServerCall,
      cachedSelections,
      setCachedSelections,
      skipEthereumLoginOnce,
      setSkipEthereumLoginOnce,
    }),
    [
      registrationServerCall,
      cachedSelections,
      skipEthereumLoginOnce,
      setSkipEthereumLoginOnce,
    ],
  );

  return (
    <RegistrationContext.Provider value={contextValue}>
      {props.children}
    </RegistrationContext.Provider>
  );
}

export { RegistrationContextProvider };

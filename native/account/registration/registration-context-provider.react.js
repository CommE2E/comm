// @flow

import * as React from 'react';

import { RegistrationContext } from './registration-context.js';
import { useRegistrationServerCall } from './registration-server-call.js';

type Props = {
  +children: React.Node,
};
function RegistrationContextProvider(props: Props): React.Node {
  const registrationServerCall = useRegistrationServerCall();
  const contextValue = React.useMemo(
    () => ({
      register: registrationServerCall,
    }),
    [registrationServerCall],
  );

  return (
    <RegistrationContext.Provider value={contextValue}>
      {props.children}
    </RegistrationContext.Provider>
  );
}

export { RegistrationContextProvider };

// @flow

import * as React from 'react';

import { RegistrationContext } from './registration-context.js';

type Props = {
  +children: React.Node,
};
function RegistrationContextProvider(props: Props): React.Node {
  const contextValue = React.useMemo(() => ({}), []);
  return (
    <RegistrationContext.Provider value={contextValue}>
      {props.children}
    </RegistrationContext.Provider>
  );
}

export { RegistrationContextProvider };

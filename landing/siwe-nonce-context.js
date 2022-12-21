// @flow

import * as React from 'react';

export type SIWENonceContextType = {
  +siweNonce: ?string,
};

const SIWENonceContext: React.Context<SIWENonceContextType> = React.createContext(
  {
    siweNonce: null,
  },
);

export { SIWENonceContext };

// @flow

import * as React from 'react';

export type SIWEContextType = {
  +siweNonce: ?string,
};

const SIWEContext: React.Context<SIWEContextType> = React.createContext({
  siweNonce: null,
});

export { SIWEContext };

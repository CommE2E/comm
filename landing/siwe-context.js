// @flow

import * as React from 'react';

export type SIWEContextType = {
  +siweNonce: ?string,
  +siwePrimaryIdentityPublicKey: ?string,
  +siweMessageType: ?string,
};

const SIWEContext: React.Context<SIWEContextType> = React.createContext({
  siweNonce: null,
  siwePrimaryIdentityPublicKey: null,
  siweMessageType: null,
});

export { SIWEContext };

// @flow

import * as React from 'react';

export type QRAuthContextType = {
  +onConnect: (data: string) => Promise<void>,
  +connectingInProgress: boolean,
  +onRemoveSecondaryDevice: () => Promise<void>,
};

const QRAuthContext: React.Context<?QRAuthContextType> =
  React.createContext<?QRAuthContextType>();

export { QRAuthContext };

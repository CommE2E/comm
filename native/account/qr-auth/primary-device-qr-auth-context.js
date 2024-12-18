// @flow

import * as React from 'react';

export type PrimaryDeviceQRAuthContextType = {
  +onConnect: (data: string) => Promise<void>,
  +connectingInProgress: boolean,
  +onRemoveSecondaryDevice: () => Promise<void>,
};

const PrimaryDeviceQRAuthContext: React.Context<?PrimaryDeviceQRAuthContextType> =
  React.createContext<?PrimaryDeviceQRAuthContextType>();

export { PrimaryDeviceQRAuthContext };

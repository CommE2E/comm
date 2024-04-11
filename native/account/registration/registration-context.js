// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';

import type {
  RegistrationServerCallInput,
  CachedUserSelections,
} from './registration-types.js';

export type RegistrationContextType = {
  +register: RegistrationServerCallInput => Promise<void>,
  +cachedSelections: CachedUserSelections,
  +setCachedSelections: SetState<CachedUserSelections>,
  // We set this when entering the registration flow from the ETH login flow so
  // that the user doesn't have to perform ETH auth again. We unset it after
  // skipping the login flow once, so that the user can back out and change it.
  +skipEthereumLoginOnce?: ?true,
  +setSkipEthereumLoginOnce: boolean => void,
  +siweBackupSecrets?: ?SIWEBackupSecrets,
  +setSIWEBackupSecrets: SetState<?SIWEBackupSecrets>,
};

const RegistrationContext: React.Context<?RegistrationContextType> =
  React.createContext<?RegistrationContextType>();

export { RegistrationContext };

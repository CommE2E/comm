// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';

import type {
  RegistrationServerCallInput,
  CachedUserSelections,
} from './registration-types.js';

export type RegistrationContextType = {
  +register: RegistrationServerCallInput => Promise<void>,
  +cachedSelections: CachedUserSelections,
  +setCachedSelections: SetState<CachedUserSelections>,
};

const RegistrationContext: React.Context<?RegistrationContextType> =
  React.createContext<?RegistrationContextType>();

export { RegistrationContext };

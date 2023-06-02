// @flow

import * as React from 'react';

import type { RegistrationServerCallInput } from './registration-types.js';

export type RegistrationContextType = {
  +register: RegistrationServerCallInput => Promise<void>,
};

const RegistrationContext: React.Context<?RegistrationContextType> =
  React.createContext<?RegistrationContextType>();

export { RegistrationContext };

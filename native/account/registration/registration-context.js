// @flow

import * as React from 'react';

export type RegistrationContextType = {};

const RegistrationContext: React.Context<?RegistrationContextType> =
  React.createContext<?RegistrationContextType>();

export { RegistrationContext };

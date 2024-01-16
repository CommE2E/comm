// @flow

import * as React from 'react';

import type { IdentityServiceClient } from '../types/identity-service-types.js';

export type IdentityClientContextType = {
  +identityClient: IdentityServiceClient,
};

const IdentityClientContext: React.Context<?IdentityClientContextType> =
  React.createContext<?IdentityClientContextType>();

export { IdentityClientContext };

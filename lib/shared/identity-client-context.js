// @flow

import * as React from 'react';

import type { IdentityServiceClient } from '../types/identity-service-types.js';

export type AuthMetadata = {
  +deviceID: ?string,
  +userID: ?string,
  +accessToken: ?string,
};

export type IdentityClientContextType = {
  +identityClient: IdentityServiceClient,
  +getAuthMetadata: () => Promise<AuthMetadata>,
};

const IdentityClientContext: React.Context<?IdentityClientContextType> =
  React.createContext<?IdentityClientContextType>();

export { IdentityClientContext };

// @flow

import * as React from 'react';

import type { IdentityServiceClient } from '../types/identity-service-types.js';

export type AuthMetadata = {
  +deviceID: ?string,
  +userID: ?string,
  +accessToken: ?string,
};

export type PartialAuthMetadata = Partial<AuthMetadata>;

export type FullAuthMetadata = {
  [K in keyof AuthMetadata]: $NonMaybeType<AuthMetadata[K]>,
};

export type IdentityClientContextType = {
  +identityClient: IdentityServiceClient,
  +getAuthMetadata: () => Promise<AuthMetadata>,
  +setAuthMetadataOverride: (metadata: PartialAuthMetadata) => void,
  +clearAuthMetadataOverride: () => void,
};

const IdentityClientContext: React.Context<?IdentityClientContextType> =
  React.createContext<?IdentityClientContextType>();

export { IdentityClientContext };

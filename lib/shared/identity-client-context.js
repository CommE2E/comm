// @flow

import * as React from 'react';

import type { IdentityServiceClient } from '../types/identity-service-types.js';

export type AuthMetadata = {
  +deviceID: ?string,
  +userID: ?string,
  +accessToken: ?string,
};

export type PartialAuthMetadata = $Shape<AuthMetadata>;

// TODO: Replace this with mapped type after Flow upgrade
export type FullAuthMetadata = $ObjMap<
  AuthMetadata,
  <T>(prop: T) => $NonMaybeType<T>,
>;

export type IdentityClientContextType = {
  +identityClient: IdentityServiceClient,
  +getAuthMetadata: () => Promise<AuthMetadata>,
  +setAuthMetadataOverride: (metadata: PartialAuthMetadata) => void,
  +clearAuthMetadataOverride: () => void,
};

const IdentityClientContext: React.Context<?IdentityClientContextType> =
  React.createContext<?IdentityClientContextType>();

export { IdentityClientContext };

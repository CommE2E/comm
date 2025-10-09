// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShapeInexact, tFarcasterID } from '../../utils/validation-utils.js';

type FarcasterProfilePicture = {
  +url: string,
  +verified: boolean,
  ...
};
const farcasterProfilePictureValidator: TInterface<FarcasterProfilePicture> =
  tShapeInexact({
    url: t.String,
    verified: t.Boolean,
  });

export type FarcasterMessageUserContext = {
  +fid: number,
  +username?: string,
  +displayName: string,
  +pfp?: FarcasterProfilePicture,
  ...
};
const farcasterMessageUserContextValidator: TInterface<FarcasterMessageUserContext> =
  tShapeInexact({
    fid: tFarcasterID,
    username: t.maybe(t.String),
    displayName: t.String,
    pfp: t.maybe(farcasterProfilePictureValidator),
  });

export type FarcasterDCUserBase = {
  +fid: number,
  +username?: string,
  +displayName: string,
  +pfp?: FarcasterProfilePicture,
  ...
};
const FarcasterDCUserBaseValidator: TInterface<FarcasterDCUserBase> =
  tShapeInexact({
    fid: tFarcasterID,
    username: t.maybe(t.String),
    displayName: t.String,
    pfp: t.maybe(farcasterProfilePictureValidator),
  });

export type FarcasterDCUser = {
  +fid: number,
  +username?: string,
  +displayName: string,
  +pfp?: FarcasterProfilePicture,
  ...
};
const farcasterDCUserValidator: TInterface<FarcasterDCUser> = tShapeInexact({
  fid: tFarcasterID,
  username: t.maybe(t.String),
  displayName: t.String,
  pfp: t.maybe(farcasterProfilePictureValidator),
});

export {
  farcasterProfilePictureValidator,
  farcasterMessageUserContextValidator,
  FarcasterDCUserBaseValidator,
  farcasterDCUserValidator,
};

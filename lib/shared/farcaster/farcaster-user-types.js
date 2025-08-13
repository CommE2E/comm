// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShapeInexact } from '../../utils/validation-utils.js';

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
    fid: t.Number,
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
    fid: t.Number,
    username: t.maybe(t.String),
    displayName: t.String,
    pfp: t.maybe(farcasterProfilePictureValidator),
  });

type FarcasterDCUserViewerContext = {
  +canSendDirectCasts?: boolean,
  +canAddToGroupDirectly?: boolean,
  +nerfed?: boolean,
  +invisible?: boolean,
  +blocking?: boolean,
  +blockedBy?: boolean,
  +enableNotifications?: boolean,
  ...
};
const farcasterDCUserViewerContextValidator: TInterface<FarcasterDCUserViewerContext> =
  tShapeInexact({
    canSendDirectCasts: t.maybe(t.Boolean),
    canAddToGroupDirectly: t.maybe(t.Boolean),
    nerfed: t.maybe(t.Boolean),
    invisible: t.maybe(t.Boolean),
    blocking: t.maybe(t.Boolean),
    blockedBy: t.maybe(t.Boolean),
    enableNotifications: t.maybe(t.Boolean),
  });

export type FarcasterDCUser = {
  +fid: number,
  +username?: string,
  +displayName: string,
  +pfp?: FarcasterProfilePicture,
  +referrerUsername?: string,
  +viewerContext?: FarcasterDCUserViewerContext,
  ...
};
const farcasterDCUserValidator: TInterface<FarcasterDCUser> = tShapeInexact({
  fid: t.Number,
  username: t.maybe(t.String),
  displayName: t.String,
  pfp: t.maybe(farcasterProfilePictureValidator),
  referrerUsername: t.maybe(t.String),
  viewerContext: t.maybe(farcasterDCUserViewerContextValidator),
});

export {
  farcasterProfilePictureValidator,
  farcasterMessageUserContextValidator,
  FarcasterDCUserBaseValidator,
  farcasterDCUserValidator,
};

// @flow

import t, { type TInterface, type TUnion, type TEnums } from 'tcomb';

import { policyTypeValidator } from '../../facts/policies.js';
import { mixedThinRawThreadInfoValidator } from '../../permissions/minimally-encoded-raw-thread-info-validators.js';
import { tShape, tID, tUserID } from '../../utils/validation-utils.js';
import type {
  LogOutResponse,
  RegisterResponse,
  ServerLogInResponse,
  ClaimUsernameResponse,
} from '../account-types.js';
import {
  type ClientAvatar,
  clientAvatarValidator,
  type UpdateUserAvatarResponse,
} from '../avatar-types.js';
import { rawEntryInfoValidator } from '../entry-types.js';
import {
  rawMessageInfoValidator,
  messageTruncationStatusesValidator,
} from '../message-types.js';
import {
  type SubscriptionUpdateResponse,
  threadSubscriptionValidator,
} from '../subscription-types.js';
import { createUpdatesResultValidator } from '../update-types.js';
import {
  loggedOutUserInfoValidator,
  loggedInUserInfoValidator,
  userInfoValidator,
} from '../user-types.js';

export const registerResponseValidator: TInterface<RegisterResponse> =
  tShape<RegisterResponse>({
    id: tUserID,
    rawMessageInfos: t.list(rawMessageInfoValidator),
    currentUserInfo: loggedInUserInfoValidator,
    cookieChange: tShape({
      threadInfos: t.dict(tID, mixedThinRawThreadInfoValidator),
      userInfos: t.list(userInfoValidator),
    }),
  });

export const logOutResponseValidator: TInterface<LogOutResponse> =
  tShape<LogOutResponse>({
    currentUserInfo: loggedOutUserInfoValidator,
  });

export const logInResponseValidator: TInterface<ServerLogInResponse> =
  tShape<ServerLogInResponse>({
    currentUserInfo: loggedInUserInfoValidator,
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: t.list(userInfoValidator),
    rawEntryInfos: t.maybe(t.list(rawEntryInfoValidator)),
    serverTime: t.Number,
    cookieChange: tShape({
      threadInfos: t.dict(tID, mixedThinRawThreadInfoValidator),
      userInfos: t.list(userInfoValidator),
    }),
    notAcknowledgedPolicies: t.maybe(t.list<TEnums>(policyTypeValidator)),
  });

export const subscriptionUpdateResponseValidator: TInterface<SubscriptionUpdateResponse> =
  tShape<SubscriptionUpdateResponse>({
    threadSubscription: threadSubscriptionValidator,
  });

export const updateUserAvatarResponseValidator: TInterface<UpdateUserAvatarResponse> =
  tShape<UpdateUserAvatarResponse>({
    updates: createUpdatesResultValidator,
  });

export const updateUserAvatarResponderValidator: TUnion<
  ?ClientAvatar | UpdateUserAvatarResponse,
> = t.union([
  t.maybe(clientAvatarValidator),
  updateUserAvatarResponseValidator,
]);

export const claimUsernameResponseValidator: TInterface<ClaimUsernameResponse> =
  tShape<ClaimUsernameResponse>({
    message: t.String,
    signature: t.String,
  });

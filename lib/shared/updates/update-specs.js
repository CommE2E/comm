// @flow

import { badDeviceTokenSpec } from './bad-device-token-spec.js';
import { deleteAccountSpec } from './delete-account-spec.js';
import { deleteThreadSpec } from './delete-thread-spec.js';
import { joinThreadSpec } from './join-thread-spec.js';
import { updateCurrentUserSpec } from './update-current-user-spec.js';
import { updateEntrySpec } from './update-entry-spec.js';
import type { UpdateSpec } from './update-spec.js';
import { updateThreadReadStatusSpec } from './update-thread-read-status-spec.js';
import { updateThreadSpec } from './update-thread-spec.js';
import { updateUserSpec } from './update-user-spec.js';
import { updateTypes, type UpdateType } from '../../types/update-types-enum.js';

export const updateSpecs: {
  +[UpdateType]: UpdateSpec<any, any, any>,
} = Object.freeze({
  [updateTypes.DELETE_ACCOUNT]: deleteAccountSpec,
  [updateTypes.UPDATE_THREAD]: updateThreadSpec,
  [updateTypes.UPDATE_THREAD_READ_STATUS]: updateThreadReadStatusSpec,
  [updateTypes.DELETE_THREAD]: deleteThreadSpec,
  [updateTypes.JOIN_THREAD]: joinThreadSpec,
  [updateTypes.BAD_DEVICE_TOKEN]: badDeviceTokenSpec,
  [updateTypes.UPDATE_ENTRY]: updateEntrySpec,
  [updateTypes.UPDATE_CURRENT_USER]: updateCurrentUserSpec,
  [updateTypes.UPDATE_USER]: updateUserSpec,
});

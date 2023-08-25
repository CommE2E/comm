// @flow

import { updateLastCommunicatedPlatformDetailsActionType } from '../actions/device-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions.js';
import type { PlatformDetails } from '../types/device-types';
import type { BaseAction } from '../types/redux-types';
import { getConfig } from '../utils/config.js';

export default function reduceLastCommunicatedPlatformDetails(
  state: ?PlatformDetails,
  action: BaseAction,
): ?PlatformDetails {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success
  ) {
    return getConfig().platformDetails;
  }
  if (action.type === updateLastCommunicatedPlatformDetailsActionType) {
    return action.payload;
  }
  return state;
}

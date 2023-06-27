// @flow

import { updateLastCommunicatedPlatformDetailsActionType } from '../actions/device-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions.js';
import type { LastCommunicatedPlatformDetails } from '../types/device-types';
import type { BaseAction } from '../types/redux-types';
import { getConfig } from '../utils/config.js';

export default function reduceLastCommunicatedPlatformDetails(
  state: LastCommunicatedPlatformDetails,
  action: BaseAction,
  currentURLPrefix: string,
): LastCommunicatedPlatformDetails {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success
  ) {
    return {
      ...state,
      [currentURLPrefix]: getConfig().platformDetails,
    };
  }
  if (action.type === updateLastCommunicatedPlatformDetailsActionType) {
    return {
      ...state,
      ...action.payload,
    };
  }
  return state;
}

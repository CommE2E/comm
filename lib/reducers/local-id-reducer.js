// @flow

import type { BaseAction } from '../types/redux-types';

import invariant from 'invariant';

import {
  numberFromLocalID,
  highestLocalIDSelector,
} from '../selectors/local-id-selectors';
import { rehydrateActionType } from '../types/redux-types';
import {
  sendTextMessageActionTypes,
  sendMultimediaMessageActionTypes,
  createLocalMessageActionType,
} from '../actions/message-actions';
import { createLocalEntryActionType } from '../actions/entry-actions';

export default function reduceNextLocalID(state: number, action: BaseAction) {
  let newCandidate = null;
  if (action.type === rehydrateActionType) {
    newCandidate = highestLocalIDSelector(action.payload) + 1;
    if (
      action.payload &&
      action.payload.nextLocalID &&
      action.payload.nextLocalID > newCandidate
    ) {
      newCandidate = action.payload.nextLocalID;
    }
  } else if (
    action.type === sendTextMessageActionTypes.started ||
    action.type === sendMultimediaMessageActionTypes.started ||
    action.type === createLocalEntryActionType ||
    action.type === createLocalMessageActionType
  ) {
    const { localID } = action.payload;
    invariant(localID, 'should be set');
    newCandidate = numberFromLocalID(localID) + 1;
  }
  return newCandidate && newCandidate > state ? newCandidate : state;
}

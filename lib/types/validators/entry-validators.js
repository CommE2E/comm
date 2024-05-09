// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { tShape, tID, tUserID } from '../../utils/validation-utils.js';
import {
  type DeleteEntryResponse,
  type RestoreEntryResponse,
  type FetchEntryInfosResponse,
  type DeltaEntryInfosResult,
  type SaveEntryResponse,
  rawEntryInfoValidator,
} from '../entry-types.js';
import {
  type FetchEntryRevisionInfosResult,
  historyRevisionInfoValidator,
} from '../history-types.js';
import { rawMessageInfoValidator } from '../message-types.js';
import { serverCreateUpdatesResponseValidator } from '../update-types.js';
import { accountUserInfoValidator } from '../user-types.js';

export const fetchEntryInfosResponseValidator: TInterface<FetchEntryInfosResponse> =
  tShape<FetchEntryInfosResponse>({
    rawEntryInfos: t.list(rawEntryInfoValidator),
    userInfos: t.dict(tUserID, accountUserInfoValidator),
  });

export const fetchEntryRevisionInfosResultValidator: TInterface<FetchEntryRevisionInfosResult> =
  tShape<FetchEntryRevisionInfosResult>({
    result: t.list(historyRevisionInfoValidator),
  });

export const saveEntryResponseValidator: TInterface<SaveEntryResponse> =
  tShape<SaveEntryResponse>({
    entryID: tID,
    newMessageInfos: t.list(rawMessageInfoValidator),
    updatesResult: serverCreateUpdatesResponseValidator,
  });

export const deleteEntryResponseValidator: TInterface<DeleteEntryResponse> =
  tShape<DeleteEntryResponse>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    threadID: tID,
    updatesResult: serverCreateUpdatesResponseValidator,
  });

export const restoreEntryResponseValidator: TInterface<RestoreEntryResponse> =
  tShape<RestoreEntryResponse>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    updatesResult: serverCreateUpdatesResponseValidator,
  });

export const deltaEntryInfosResultValidator: TInterface<DeltaEntryInfosResult> =
  tShape<DeltaEntryInfosResult>({
    rawEntryInfos: t.list(rawEntryInfoValidator),
    deletedEntryIDs: t.list(tID),
    userInfos: t.list(accountUserInfoValidator),
  });

// @flow

import _maxBy from 'lodash/fp/maxBy.js';

import { updateSpecs } from './updates/update-specs.js';
import {
  type ServerUpdateInfo,
  type UpdateData,
  type RawUpdateInfo,
} from '../types/update-types.js';

function mostRecentUpdateTimestamp(
  updateInfos: ServerUpdateInfo[],
  previousTimestamp: number,
): number {
  if (updateInfos.length === 0) {
    return previousTimestamp;
  }
  return _maxBy('time')(updateInfos).time;
}

function keyForUpdateData(updateData: UpdateData): ?string {
  return updateSpecs[updateData.type].keyForUpdateData?.(updateData) ?? null;
}

function keyForUpdateInfo(updateInfo: ServerUpdateInfo): ?string {
  return updateSpecs[updateInfo.type].keyForUpdateInfo?.(updateInfo) ?? null;
}

function rawUpdateInfoFromUpdateData(
  updateData: UpdateData,
  id: string,
): RawUpdateInfo {
  return updateSpecs[updateData.type].rawInfoFromData(updateData, id);
}

export {
  mostRecentUpdateTimestamp,
  keyForUpdateData,
  keyForUpdateInfo,
  rawUpdateInfoFromUpdateData,
};

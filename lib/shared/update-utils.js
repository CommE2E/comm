// @flow

import type { UpdateInfo } from '../types/update-types';

import _maxBy from 'lodash/fp/maxBy';

function mostRecentUpdateTimestamp(
  updateInfos: UpdateInfo[],
  lastPing: number,
): number {
  if (updateInfos.length === 0) {
    return lastPing;
  }
  return _maxBy('time')(updateInfos).time;
}

export {
  mostRecentUpdateTimestamp,
};

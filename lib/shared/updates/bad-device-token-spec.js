// @flow

import type { UpdateSpec } from './update-spec.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  BadDeviceTokenRawUpdateInfo,
  BadDeviceTokenUpdateData,
  BadDeviceTokenUpdateInfo,
} from '../../types/update-types.js';

export const badDeviceTokenSpec: UpdateSpec<
  BadDeviceTokenUpdateInfo,
  BadDeviceTokenRawUpdateInfo,
  BadDeviceTokenUpdateData,
> = Object.freeze({
  rawUpdateInfoFromRow(row: Object) {
    const { deviceToken } = JSON.parse(row.content);
    return {
      type: updateTypes.BAD_DEVICE_TOKEN,
      id: row.id.toString(),
      time: row.time,
      deviceToken,
    };
  },
  updateContentForServerDB(data: BadDeviceTokenUpdateData) {
    const { deviceToken } = data;
    return JSON.stringify({ deviceToken });
  },
});

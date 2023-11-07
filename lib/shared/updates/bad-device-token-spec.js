// @flow

import t from 'tcomb';

import type { UpdateSpec } from './update-spec.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  BadDeviceTokenRawUpdateInfo,
  BadDeviceTokenUpdateData,
  BadDeviceTokenUpdateInfo,
} from '../../types/update-types.js';
import { tNumber, tShape } from '../../utils/validation-utils.js';

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
  updateInfoFromRawInfo(info: BadDeviceTokenRawUpdateInfo) {
    return {
      type: updateTypes.BAD_DEVICE_TOKEN,
      id: info.id,
      time: info.time,
      deviceToken: info.deviceToken,
    };
  },
  deleteCondition: null,
  typesOfReplacedUpdatesForMatchingKey: null,
  infoValidator: tShape<BadDeviceTokenUpdateInfo>({
    type: tNumber(updateTypes.BAD_DEVICE_TOKEN),
    id: t.String,
    time: t.Number,
    deviceToken: t.String,
  }),
});

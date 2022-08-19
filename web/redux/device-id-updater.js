// @flow
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { generateDeviceID, deviceIDTypes } from '../utils/device-id';
import { setDeviceIDActionType } from './action-types';

export default function DeviceIDUpdater(): null {
  const dispatch = useDispatch();
  const deviceID = useSelector(state => state.deviceID);

  useEffect(() => {
    if (deviceID === null) {
      const newDeviceID = generateDeviceID(deviceIDTypes.WEB);
      dispatch({
        type: setDeviceIDActionType,
        payload: newDeviceID,
      });
    }
  });

  return null;
}

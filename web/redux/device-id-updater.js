// @flow
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { generateDeviceID, deviceIDTypes } from '../utils/device-id';
import { setDeviceIDActionType } from './action-types';

function DeviceIDUpdater(): null {
  const dispatch = useDispatch();
  const deviceID = useSelector(state => state.deviceID);
  const hasDeviceID = !!deviceID;
  const hadDeviceIDRef = React.useRef<?boolean>(null);

  React.useEffect(() => {
    if (hadDeviceIDRef.current !== false && !hasDeviceID) {
      const newDeviceID = generateDeviceID(deviceIDTypes.WEB);
      dispatch({
        type: setDeviceIDActionType,
        payload: newDeviceID,
      });
    }
    hadDeviceIDRef.current = hasDeviceID;
  }, [hasDeviceID, dispatch]);

  return null;
}

export default DeviceIDUpdater;

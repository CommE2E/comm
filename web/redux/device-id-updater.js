// @flow
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { generateDeviceID, deviceTypes } from '../utils/device-id.js';
import { setDeviceIDActionType } from './action-types.js';

function DeviceIDUpdater(): null {
  const dispatch = useDispatch();
  const deviceID = useSelector(state => state.deviceID);
  const hasDeviceID = !!deviceID;
  const hadDeviceIDRef = React.useRef<?boolean>(null);

  React.useEffect(() => {
    if (hadDeviceIDRef.current !== false && !hasDeviceID) {
      const newDeviceID = generateDeviceID(deviceTypes.WEB);
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

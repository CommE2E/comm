// @flow

import { PermissionsAndroid } from 'react-native';
import type { Rationale } from '../types/react-native';

const granted = new Set();

async function getAndroidPermission(permission: string, rationale?: Rationale) {
  if (granted.has(permission)) {
    return true;
  }
  try {
    const result = await PermissionsAndroid.request(permission, rationale);
    const gotPermission = result === PermissionsAndroid.RESULTS.GRANTED;
    if (gotPermission) {
      granted.add(permission);
    }
    return gotPermission;
  } catch (err) {
    return false;
  }
}

export { getAndroidPermission };

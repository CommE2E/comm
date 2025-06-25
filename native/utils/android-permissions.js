// @flow

import { PermissionsAndroid } from 'react-native';
import type {
  Permission,
  PermissionStatus,
} from 'react-native/Libraries/PermissionsAndroid/PermissionsAndroid.js';

import { getMessageForException } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';

type CheckOrRequest = 'check' | 'request';
type ThrowExceptions = 'throw' | typeof undefined;

type PermissionsResult = { +[permission: string]: boolean };

const emptyObj: PermissionsResult = {};

async function getAndroidPermissions(
  permissions: Array<Permission>,
  checkOrRequest: CheckOrRequest,
  throwExceptions?: ThrowExceptions,
): Promise<PermissionsResult> {
  if (permissions.length === 0) {
    return emptyObj;
  }

  if (checkOrRequest === 'check') {
    const result: { [string]: Promise<boolean> } = {};
    for (const permission of permissions) {
      result[permission] = (async () => {
        try {
          return await PermissionsAndroid.check(permission);
        } catch (e) {
          printException(e, 'PermissionsAndroid.check');
          if (throwExceptions === 'throw') {
            throw e;
          }
          return false;
        }
      })();
    }
    return await promiseAll(result);
  }

  let requestResult: { [permission: Permission]: PermissionStatus } = {};
  try {
    requestResult = await PermissionsAndroid.requestMultiple(permissions);
  } catch (e) {
    printException(e, 'PermissionsAndroid.requestMultiple');
    if (throwExceptions === 'throw') {
      throw e;
    }
  }

  const result: { [string]: boolean } = {};
  for (const permission of permissions) {
    result[permission] =
      requestResult[permission] === PermissionsAndroid.RESULTS.GRANTED;
  }
  return result;
}

function printException(e: mixed, caller: string) {
  const exceptionMessage = getMessageForException(e);
  const suffix = exceptionMessage ? `: ${exceptionMessage}` : '';
  console.log(`${caller} returned exception${suffix}`);
}

function requestAndroidPermissions(
  permissions: Array<Permission>,
  throwExceptions?: ThrowExceptions,
): Promise<PermissionsResult> {
  return getAndroidPermissions(permissions, 'request', throwExceptions);
}

function checkAndroidPermissions(
  permissions: Array<Permission>,
  throwExceptions?: ThrowExceptions,
): Promise<PermissionsResult> {
  return getAndroidPermissions(permissions, 'check', throwExceptions);
}

async function getAndroidPermission(
  permission: Permission,
  checkOrRequest: CheckOrRequest,
  throwExceptions?: ThrowExceptions,
): Promise<boolean> {
  const result = await getAndroidPermissions(
    [permission],
    checkOrRequest,
    throwExceptions,
  );
  return !!result[permission];
}

function requestAndroidPermission(
  permission: Permission,
  throwExceptions?: ThrowExceptions,
): Promise<boolean> {
  return getAndroidPermission(permission, 'request', throwExceptions);
}

function checkAndroidPermission(
  permission: Permission,
  throwExceptions?: ThrowExceptions,
): Promise<boolean> {
  return getAndroidPermission(permission, 'check', throwExceptions);
}

export {
  getAndroidPermissions,
  requestAndroidPermissions,
  checkAndroidPermissions,
  getAndroidPermission,
  requestAndroidPermission,
  checkAndroidPermission,
};

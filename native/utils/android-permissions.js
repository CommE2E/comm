// @flow

import { PermissionsAndroid } from 'react-native';

import { getMessageForException } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';

const granted = new Set();

type CheckOrRequest = 'check' | 'request';
type ThrowExceptions = 'throw' | typeof undefined;

type PermissionsResult = { +[permission: string]: boolean };

async function getAndroidPermissions(
  permissions: $ReadOnlyArray<string>,
  checkOrRequest: CheckOrRequest,
  throwExceptions?: ThrowExceptions,
): Promise<PermissionsResult> {
  const result = {},
    missing = [];

  for (const permission of permissions) {
    if (granted.has(permission)) {
      result[permission] = true;
    } else {
      missing.push(permission);
    }
  }
  if (missing.length === 0) {
    return result;
  }

  if (checkOrRequest === 'check') {
    for (const permission of missing) {
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

  let requestResult = {};
  try {
    requestResult = await PermissionsAndroid.requestMultiple(missing);
  } catch (e) {
    printException(e, 'PermissionsAndroid.requestMultiple');
    if (throwExceptions === 'throw') {
      throw e;
    }
  }
  for (const permission of missing) {
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
  permissions: $ReadOnlyArray<string>,
  throwExceptions?: ThrowExceptions,
): Promise<PermissionsResult> {
  return getAndroidPermissions(permissions, 'request', throwExceptions);
}

function checkAndroidPermissions(
  permissions: $ReadOnlyArray<string>,
  throwExceptions?: ThrowExceptions,
): Promise<PermissionsResult> {
  return getAndroidPermissions(permissions, 'check', throwExceptions);
}

async function getAndroidPermission(
  permission: string,
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
  permission: string,
  throwExceptions?: ThrowExceptions,
): Promise<boolean> {
  return getAndroidPermission(permission, 'request', throwExceptions);
}

function checkAndroidPermission(
  permission: string,
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

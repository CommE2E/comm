// @flow

import stableStringify from 'fast-json-stable-stringify';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import _isPlainObject from 'lodash/fp/isPlainObject.js';
import stringHash from 'string-hash';

type Map<K, T> = { +[key: K]: T };

function findMaximumDepth(obj: Object): ?{ path: string, depth: number } {
  let longestPath = null;
  let longestDepth = null;
  for (const key in obj) {
    const value = obj[key];
    if (typeof value !== 'object' || !value) {
      if (!longestDepth) {
        longestPath = key;
        longestDepth = 1;
      }
      continue;
    }
    const childResult = findMaximumDepth(obj[key]);
    if (!childResult) {
      continue;
    }
    const { path, depth } = childResult;
    const ourDepth = depth + 1;
    if (longestDepth === null || ourDepth > longestDepth) {
      longestPath = `${key}.${path}`;
      longestDepth = ourDepth;
    }
  }
  if (!longestPath || !longestDepth) {
    return null;
  }
  return { path: longestPath, depth: longestDepth };
}

function values<K, T>(map: Map<K, T>): T[] {
  return Object.values
    ? // https://github.com/facebook/flow/issues/2221
      // $FlowFixMe - Object.values currently does not have good flow support
      Object.values(map)
    : Object.keys(map).map((key: K): T => map[key]);
}

function hash(obj: ?Object): number {
  if (!obj) {
    return -1;
  }
  return stringHash(stableStringify(obj));
}

// returns an object with properties from obj1 not included in obj2
function deepDiff(obj1: Object, obj2: Object): Object {
  const diff = {};
  for (const key in obj1) {
    if (key in obj2 && _isEqual(obj1[key], obj2[key])) {
      continue;
    }

    if (!_isPlainObject(obj1[key]) || !_isPlainObject(obj2[key])) {
      diff[key] = obj1[key];
      continue;
    }

    const nestedDiff = deepDiff(obj1[key], obj2[key]);
    if (Object.keys(nestedDiff).length > 0) {
      diff[key] = nestedDiff;
    }
  }
  return diff;
}

function assertObjectsAreEqual<K, T>(
  processedObject: Map<K, T>,
  expectedObject: Map<K, T>,
  message: string,
) {
  if (_isEqual(processedObject)(expectedObject)) {
    return;
  }
  const dataProcessedButNotExpected = deepDiff(processedObject, expectedObject);
  const dataExpectedButNotProcessed = deepDiff(expectedObject, processedObject);

  invariant(
    false,
    `${message}: Objects should be equal.` +
      ` Data processed but not expected:` +
      ` ${JSON.stringify(dataProcessedButNotExpected)}` +
      ` Data expected but not processed:` +
      ` ${JSON.stringify(dataExpectedButNotProcessed)}`,
  );
}

export { findMaximumDepth, values, hash, assertObjectsAreEqual, deepDiff };

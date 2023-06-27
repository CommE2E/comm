// @flow

import stableStringify from 'fast-json-stable-stringify';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import _isPlainObject from 'lodash/fp/isPlainObject.js';
import stringHash from 'string-hash';

type ObjectMap<K, T> = { +[key: K]: T };
type NestedObjectMap<K, T> = { +[key: K]: T | NestedObjectMap<K, T> };

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

function values<K, T>(map: ObjectMap<K, T>): T[] {
  return Object.values
    ? // https://github.com/facebook/flow/issues/2221
      // $FlowFixMe - Object.values currently does not have good flow support
      Object.values(map)
    : Object.keys(map).map((key: K): T => map[key]);
}

function keys<K, T>(map: ObjectMap<K, T>): K[] {
  return Object.keys(map);
}

function entries<K: string, T>(map: ObjectMap<K, T>): [K, T][] {
  // $FlowFixMe - flow treats the values as mixed, but we know that they are T
  return Object.entries(map);
}

function assignValueWithKey<K, T>(
  obj: NestedObjectMap<K, T>,
  key: K,
  value: T | NestedObjectMap<K, T>,
): NestedObjectMap<K, T> {
  return {
    ...obj,
    ...Object.fromEntries([[key, value]]),
  };
}

function hash(obj: ?Object): number {
  if (!obj) {
    return -1;
  }
  return stringHash(stableStringify(obj));
}

// returns an object with properties from obj1 not included in obj2
function deepDiff<K, T>(
  obj1: NestedObjectMap<K, T>,
  obj2: NestedObjectMap<K, T>,
): NestedObjectMap<K, T> {
  let diff: NestedObjectMap<K, T> = {};
  keys(obj1).forEach((key: K) => {
    if (_isEqual(obj1[key], obj2[key])) {
      return;
    }

    if (!_isPlainObject(obj1[key]) || !_isPlainObject(obj2[key])) {
      diff = assignValueWithKey(diff, key, obj1[key]);
      return;
    }

    const nestedObj1: ObjectMap<K, T> = (obj1[key]: any);
    const nestedObj2: ObjectMap<K, T> = (obj2[key]: any);

    const nestedDiff = deepDiff(nestedObj1, nestedObj2);
    if (Object.keys(nestedDiff).length > 0) {
      diff = assignValueWithKey(diff, key, nestedDiff);
    }
  });
  return diff;
}

function assertObjectsAreEqual<K, T>(
  processedObject: ObjectMap<K, T>,
  expectedObject: ObjectMap<K, T>,
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

export {
  findMaximumDepth,
  values,
  hash,
  assertObjectsAreEqual,
  deepDiff,
  entries,
};

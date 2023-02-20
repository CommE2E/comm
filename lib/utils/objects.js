// @flow

import stableStringify from 'fast-json-stable-stringify';
import invariant from 'invariant';
import _difference from 'lodash/fp/difference.js';
import _isEqual from 'lodash/fp/isEqual.js';
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

function assertObjectsAreEqual<K, T>(
  processedObject: Map<K, T>,
  expectedObject: Map<K, T>,
  message: string,
) {
  const processedObjectKeys = Object.keys(processedObject);
  const expectedObjectKeys = Object.keys(expectedObject);

  const inProcessedButNotExpected =
    _difference(processedObjectKeys)(expectedObjectKeys);
  const inExpectedButNotProcessed =
    _difference(expectedObjectKeys)(processedObjectKeys);

  invariant(
    _isEqual(processedObject)(expectedObject),
    `${message}: Objects should be equal.` +
      ` Object keys processed but not expected:` +
      ` ${inExpectedButNotProcessed.toString()}` +
      ` Object keys expected but not processed:` +
      ` ${inProcessedButNotExpected.toString()}`,
  );
}

export { findMaximumDepth, values, hash, assertObjectsAreEqual };

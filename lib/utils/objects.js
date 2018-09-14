// @flow

function findMaximumDepth(obj: Object): ?{ path: string, depth: number } {
  let longestPath = null;
  let longestDepth = null
  for (let key in obj) {
    const value = obj[key];
    if (typeof value !== "object" || !value) {
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

type Map<K, T> = {[key: K]: T};
function values<K, T>(map: Map<K, T>): T[] {
  return Object.values
    ? // https://github.com/facebook/flow/issues/2221
      // $FlowFixMe - Object.values currently does not have good flow support
      Object.values(map)
    : Object.keys(map).map((key: K): T => map[key]);
}

export {
  findMaximumDepth,
  values,
};

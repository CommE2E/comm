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

export {
  findMaximumDepth,
};

// @flow

const cachedJSON = new Map();
async function importJSON<T>(path: string): Promise<?T> {
  const cached = cachedJSON.get(path);
  if (cached !== undefined) {
    return cached;
  }
  try {
    // $FlowFixMe
    const importedJSON = await import(`../../${path}`);
    if (!cachedJSON.has(path)) {
      cachedJSON.set(path, importedJSON.default);
    }
  } catch {
    if (!cachedJSON.has(path)) {
      cachedJSON.set(path, null);
    }
  }
  return cachedJSON.get(path);
}

export { importJSON };

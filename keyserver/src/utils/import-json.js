// @flow

const cachedJSON = new Map();
async function importJSON<T>(path: string): Promise<?T> {
  const cached = cachedJSON.get(path);
  if (cached !== undefined) {
    return cached;
  }
  const json = await getJSON(path);
  if (!cachedJSON.has(path)) {
    cachedJSON.set(path, json);
  }
  return cachedJSON.get(path);
}

async function getJSON<T>(path: string): Promise<?T> {
  try {
    // $FlowFixMe
    const importedJSON = await import(`../../${path}`);
    return importedJSON.default;
  } catch {
    return null;
  }
}

export { importJSON };

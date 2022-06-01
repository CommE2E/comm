// @flow

type ConfigName = {
  +folder: 'secrets' | 'facts',
  +name: string,
};

function getKeyForConfigName(configName: ConfigName): string {
  return `${configName.folder}_${configName.name}`;
}

function getPathForConfigName(configName: ConfigName): string {
  return `${configName.folder}/${configName.name}.json`;
}

const cachedJSON = new Map();
async function importJSON<T>(configName: ConfigName): Promise<?T> {
  const key = getKeyForConfigName(configName);
  const cached = cachedJSON.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const json = await getJSON(configName);
  if (!cachedJSON.has(key)) {
    cachedJSON.set(key, json);
  }
  return cachedJSON.get(key);
}

async function getJSON<T>(configName: ConfigName): Promise<?T> {
  const key = getKeyForConfigName(configName);
  const fromEnv = process.env[`COMM_JSONCONFIG_${key}`];
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv);
    } catch (e) {
      console.log(
        `failed to parse JSON from env for ${JSON.stringify(configName)}`,
        e,
      );
    }
  }
  const path = getPathForConfigName(configName);
  try {
    // $FlowFixMe
    const importedJSON = await import(`../../${path}`);
    return importedJSON.default;
  } catch {
    return null;
  }
}

export { importJSON };

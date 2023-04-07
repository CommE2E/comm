// @flow

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

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

// This function checks for an env var named COMM_JSONCONFIG_{folder}_{name}
// If it doesn't find one, it then looks for keyserver/{folder}/{name}.json
// In both cases, it expects to find a JSON blob
async function getCommConfig<T>(configName: ConfigName): Promise<?T> {
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

  let filePath = getPathForConfigName(configName);
  const cwd = path.resolve();
  if (!cwd.endsWith('/keyserver')) {
    filePath = `../keyserver/${filePath}`;
  }

  try {
    const pathString = await readFile(filePath, 'utf8');
    return JSON.parse(pathString);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.log(`Failed to read JSON from ${filePath}`, e);
    }
    return null;
  }
}

export { getCommConfig };

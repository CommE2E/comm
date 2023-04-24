// @flow

import invariant from 'invariant';
import fs from 'react-native-fs';

import type { MediaCachePersistence } from 'lib/components/media-cache-provider.react.js';
import {
  extensionFromFilename,
  filenameFromPathOrURI,
  filenameWithoutExtension,
  pathFromURI,
  readableFilename,
  replaceExtension,
} from 'lib/media/file-utils.js';

import { temporaryDirectoryPath } from './file-utils.js';

const cacheDirectory = `${temporaryDirectoryPath}media-cache`;

function basenameFromHolder(holder: string) {
  // if holder is a file URI or path, use the last segment of the path
  const holderBase = holder.split('/').pop();
  return filenameWithoutExtension(holderBase);
}

async function ensureCacheDirectory() {
  await fs.mkdir(cacheDirectory, {
    // iOS only, apple rejects apps having offline cache without this attribute
    NSURLIsExcludedFromBackupKey: true,
  });
}

async function listCachedFiles() {
  await ensureCacheDirectory();
  return await fs.readdir(cacheDirectory);
}

async function getCacheSize() {
  const files = await listCachedFiles();
  return files.reduce((total, file) => total + file.size, 0);
}

async function hasURI(uri: string): Promise<boolean> {
  const path = pathFromURI(uri);
  if (!path) {
    return false;
  }
  return await fs.exists(path);
}

async function getCachedFile(holder: string) {
  const cachedFiles = await listCachedFiles();
  const baseHolder = basenameFromHolder(holder);
  const cachedFile = cachedFiles.find(file =>
    filenameWithoutExtension(file).startsWith(baseHolder),
  );
  if (cachedFile) {
    return `file://${cacheDirectory}/${cachedFile}`;
  }
  return null;
}

async function clearCache() {
  const cacheDirExists = await fs.exists(cacheDirectory);
  if (cacheDirExists) {
    await fs.unlink(cacheDirectory);
  }
  // recreate empty directory
  await ensureCacheDirectory();
}

const dataURLRegex = /^data:([^;]+);base64,([a-zA-Z0-9+/]+={0,2})$/;
async function saveFile(holder: string, uri: string): Promise<string> {
  await ensureCacheDirectory();
  let filePath;
  const baseHolder = basenameFromHolder(holder);
  const isDataURI = uri.startsWith('data:');
  if (isDataURI) {
    const [, mime, data] = uri.match(dataURLRegex) ?? [];
    invariant(mime, 'malformed data-URI: missing MIME type');
    invariant(data, 'malformed data-URI: invalid data');
    const filename = readableFilename(baseHolder, mime) ?? baseHolder;
    filePath = `${cacheDirectory}/${filename}`;

    await fs.writeFile(filePath, data, 'base64');
  } else {
    const uriFilename = filenameFromPathOrURI(uri);
    invariant(uriFilename, 'malformed URI: missing filename');
    const extension = extensionFromFilename(uriFilename);
    const filename = extension
      ? replaceExtension(baseHolder, extension)
      : baseHolder;
    filePath = `${cacheDirectory}/${filename}`;
    await fs.copyFile(uri, filePath);
  }
  return `file://${filePath}`;
}

async function cleanupOldFiles(cacheSizeLimit: number): Promise<boolean> {
  await ensureCacheDirectory();
  const files = await fs.readDir(cacheDirectory);
  let cacheSize = files.reduce((total, file) => total + file.size, 0);
  const filesSorted = [...files].sort((a, b) => a.mtime - b.mtime);

  const filenamesToRemove = [];
  while (cacheSize > cacheSizeLimit) {
    const file = filesSorted.shift();
    if (!file) {
      break;
    }
    filenamesToRemove.push(file.name);
    cacheSize -= file.size;
  }
  await Promise.all(
    filenamesToRemove.map(file => fs.unlink(`${cacheDirectory}/${file}`)),
  );
  return filenamesToRemove.length > 0;
}

const filesystemMediaCache: MediaCachePersistence = {
  hasURI,
  getCachedFile,
  saveFile,
  getCacheSize,
  cleanupOldFiles,
  clearCache,
};

export { filesystemMediaCache };

// @flow

import * as React from 'react';

/**
 * This represents a persistent cache layer (e.g filesystem)
 * underneath the memory Holder->URI map.
 */
export type MediaCachePersistence = {
  // returns true if the URI is a cached media URI. This check should be fast
  +hasURI: (uri: string) => Promise<boolean>,
  // returns URI if holder cached or null if not
  +getCachedFile: (holder: string) => Promise<?string>,
  // returns URI of saved file
  +saveFile: (holder: string, uri: string) => Promise<string>,
  // clears cache (deletes all files)
  +clearCache: () => Promise<void>,
  // returns size of cache in bytes
  +getCacheSize: () => Promise<number>,
  // cleans up old files until cache size is less than cacheSizeLimit (bytes)
  // returns true if some files were deleted and memory cache should be
  // invalidated
  +cleanupOldFiles: (cacheSizeLimit: number) => Promise<boolean>,
};

const DEFAULT_CACHE_SIZE_LIMIT = 100 * 1024 * 1024; // 100 MiB in bytes

type MediaCacheContextType = {
  /**
   * Gets the URI for a given holder, or `null` if it's not cached.
   */
  +get: (holder: string) => Promise<?string>,
  /**
   * Saves the URI for a given holder. Accepts both file and data URIs.
   */
  +set: (holder: string, uri: string) => Promise<void>,
  /**
   * Clears the in-memory cache and cleans up old files from the platform cache.
   * This should be called when no media components are mounted.
   */
  +evictCache: () => Promise<void>,
};

function createMediaCacheContext(
  persistence: MediaCachePersistence,
  options: { +cacheSizeLimit?: number },
): MediaCacheContextType {
  // holder -> URI
  const uriCache = new Map<string, string>();

  async function get(holder: string): Promise<?string> {
    const cachedURI = uriCache.get(holder);
    if (cachedURI) {
      // even though we have the URI in memory, we still need to check if it's
      // still valid (e.g. file was deleted from the platform cache)
      const uriExists = await persistence.hasURI(cachedURI);
      if (uriExists) {
        return cachedURI;
      } else {
        uriCache.delete(holder);
      }
    }
    // if the in-memory cache doesn't have it, check the platform cache
    const cachedFile = await persistence.getCachedFile(holder);
    if (cachedFile) {
      uriCache.set(holder, cachedFile);
    }
    return cachedFile;
  }

  async function set(holder: string, uri: string): Promise<void> {
    const cachedURI = await persistence.saveFile(holder, uri);
    uriCache.set(holder, cachedURI);
  }

  async function evictCache() {
    uriCache.clear();
    try {
      await persistence.cleanupOldFiles(
        options.cacheSizeLimit ?? DEFAULT_CACHE_SIZE_LIMIT,
      );
    } catch {
      // TODO: Do we need to do anything here?
    }
  }

  return { get, set, evictCache };
}

const MediaCacheContext: React.Context<?MediaCacheContextType> =
  React.createContext<?MediaCacheContextType>(null);

type Props = {
  +children: React.Node,
  +persistence: MediaCachePersistence,
  +cacheSizeLimit?: number,
};
function MediaCacheProvider(props: Props): React.Node {
  const { children, persistence, cacheSizeLimit } = props;

  const cacheContext = React.useMemo(
    () => createMediaCacheContext(persistence, { cacheSizeLimit }),
    [persistence, cacheSizeLimit],
  );

  return (
    <MediaCacheContext.Provider value={cacheContext}>
      {children}
    </MediaCacheContext.Provider>
  );
}

export { MediaCacheContext, MediaCacheProvider };

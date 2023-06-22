// @flow

import * as React from 'react';

/**
 * This represents a persistent cache layer (e.g filesystem)
 * underneath the memory Holder->URI map.
 */
export type MediaCachePersistence = {
  // returns true if the URI is a cached media URI. This check should be fast
  +hasURI: (mediaURI: string) => Promise<boolean>,
  // returns URI if blob URI is cached or null if not
  +getCachedFile: (blobURI: string) => Promise<?string>,
  // returns URI of saved file. Blob URI is the cache key, media URI is the
  // media content URI (either file or data-uri)
  +saveFile: (blobURI: string, mediaURI: string) => Promise<string>,
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
   * Gets the media URI for a given blob URI, or `null` if it's not cached.
   */
  +get: (blobURI: string) => Promise<?string>,
  /**
   * Saves the media URI for a given blob URI. Accepts both file and data URIs.
   */
  +set: (blobURI: string, mediaURI: string) => Promise<void>,
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

  async function get(blobURI: string): Promise<?string> {
    const cachedMediaURI = uriCache.get(blobURI);
    if (cachedMediaURI) {
      // even though we have the URI in memory, we still need to check if it's
      // still valid (e.g. file was deleted from the platform cache)
      const uriExists = await persistence.hasURI(cachedMediaURI);
      if (uriExists) {
        return cachedMediaURI;
      } else {
        uriCache.delete(blobURI);
      }
    }
    // if the in-memory cache doesn't have it, check the platform cache
    const cachedFile = await persistence.getCachedFile(blobURI);
    if (cachedFile) {
      uriCache.set(blobURI, cachedFile);
    }
    return cachedFile;
  }

  async function set(blobURI: string, mediaURI: string): Promise<void> {
    const cachedURI = await persistence.saveFile(blobURI, mediaURI);
    uriCache.set(blobURI, cachedURI);
  }

  async function evictCache() {
    uriCache.clear();
    try {
      await persistence.cleanupOldFiles(
        options.cacheSizeLimit ?? DEFAULT_CACHE_SIZE_LIMIT,
      );
    } catch (e) {
      console.log('Failed to evict media cache', e);
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

// @flow

import * as React from 'react';

import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';

type LockStatus = 'acquired' | 'should-release' | 'requested' | 'released';
const ABORT_REASON_BACKGROUNDED = 'backgrounded';

function useWebLock(name: string): {
  lockStatus: LockStatus,
  releaseLock: () => void,
} {
  const [lock, setLock] = React.useState<null | {
    controller: AbortController,
    resolveCallback: ?() => void,
  }>(null);

  const releaseLock = React.useCallback(() => {
    if (!lock) {
      return;
    }

    // Abort lock request if we don't have it
    lock.controller.abort(ABORT_REASON_BACKGROUNDED);
    // Release lock if we have it
    lock?.resolveCallback?.();
    // The `navigator.locks.request` promise should now resolve
    // and the lock will be set to null
  }, [lock]);

  const isVisible = useIsAppForegrounded();
  React.useEffect(() => {
    if (!isVisible) {
      // If the tab isn't visible and we haven't acquired the lock
      // we want to abort the request
      if (lock && !lock.resolveCallback) {
        releaseLock();
      }
      return;
    }

    if (lock) {
      return;
    }

    const controller = new AbortController();
    setLock({
      controller,
      resolveCallback: null,
    });

    void (async () => {
      try {
        const lockManager: LockManager = (navigator: any).locks;
        // This promise will resolve after we get a lock
        // and the inner Promise resolves. It will reject
        // if we abort the request or there is an error.
        await lockManager.request(
          name,
          { signal: controller.signal },
          () =>
            new Promise(resolve => {
              setLock({ controller, resolveCallback: resolve });
            }),
        );
      } catch (err) {
        if (err !== ABORT_REASON_BACKGROUNDED) {
          console.log('Error when requesting a lock', err);
        }
      }

      setLock(null);
    })();
  }, [isVisible, lock, name, releaseLock]);

  const lockStatus = React.useMemo(() => {
    if (!lock) {
      return 'released';
    }
    if (!lock?.resolveCallback) {
      return 'requested';
    }
    if (!isVisible) {
      return 'should-release';
    }

    return 'acquired';
  }, [lock, isVisible]);

  return { lockStatus, releaseLock };
}

type LockManager = {
  request: <T>(
    name: string,
    options: {
      mode?: LockMode,
      ifAvailable?: boolean,
      steal?: boolean,
      signal?: AbortSignal,
    },
    callback: (Lock) => Promise<T>,
  ) => Promise<T>,
  query: () => Promise<{
    held: $ReadOnlyArray<LockInfo>,
    pending: $ReadOnly<LockInfo>,
  }>,
};

type Lock = {
  name: string,
  mode: LockMode,
};

type LockInfo = {
  name: string,
  mode: LockMode,
  clientID: string,
};

type LockMode = 'exclusive' | 'shared';

export { useWebLock };

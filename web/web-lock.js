// @flow

import * as React from 'react';

import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';

const lockStatuses = Object.freeze({
  ACQUIRED: 'acquired',
  SHOULD_RELEASE: 'should-release',
  REQUESTED: 'requested',
  RELEASED: 'released',
});
export type LockStatus = $Values<typeof lockStatuses>;
const ABORT_REASON_BACKGROUNDED = 'backgrounded';

function useWebLock(name: string): {
  lockStatus: LockStatus,
  releaseLockOrAbortRequest: () => void,
} {
  const [lockRequest, setLockRequest] = React.useState<null | {
    controller: AbortController,
    resolveCallback: ?() => void,
  }>(null);

  const releaseLockOrAbortRequest = React.useCallback(() => {
    if (!lockRequest) {
      return;
    }

    // Abort lock request if we don't have it
    lockRequest.controller.abort(ABORT_REASON_BACKGROUNDED);
    // Release lock if we have it
    lockRequest?.resolveCallback?.();
    // The `navigator.locks.request` promise should now resolve
    // and the lock will be set to null
  }, [lockRequest]);

  const isVisible = useIsAppForegrounded();
  React.useEffect(() => {
    if (!isVisible) {
      // If the tab isn't visible and we haven't acquired the lock
      // we want to abort the request
      if (lockRequest && !lockRequest.resolveCallback) {
        releaseLockOrAbortRequest();
      }
      return;
    }

    if (lockRequest) {
      return;
    }

    const controller = new AbortController();
    setLockRequest({
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
              setLockRequest({ controller, resolveCallback: resolve });
            }),
        );
      } catch (err) {
        if (err !== ABORT_REASON_BACKGROUNDED) {
          console.log('Error when requesting a lock', err);
        }
      }

      setLockRequest(null);
    })();
  }, [isVisible, lockRequest, name, releaseLockOrAbortRequest]);

  const lockStatus = React.useMemo(() => {
    if (!lockRequest) {
      return lockStatuses.RELEASED;
    }
    if (!lockRequest?.resolveCallback) {
      return lockStatuses.REQUESTED;
    }
    if (!isVisible) {
      return lockStatuses.SHOULD_RELEASE;
    }

    return lockStatuses.ACQUIRED;
  }, [lockRequest, isVisible]);

  React.useEffect(() => {
    if (!import.meta.webpackHot) {
      return undefined;
    }
    const webpackHot: WebpackHot = (import.meta.webpackHot: any);
    webpackHot.dispose(releaseLockOrAbortRequest);
    return () => {
      webpackHot.removeDisposeHandler(releaseLockOrAbortRequest);
    };
  }, [releaseLockOrAbortRequest]);

  return { lockStatus, releaseLockOrAbortRequest };
}

type LockManager = {
  +request: <T>(
    name: string,
    options: {
      +mode?: LockMode,
      +ifAvailable?: boolean,
      +steal?: boolean,
      +signal?: AbortSignal,
    },
    callback: (Lock) => Promise<T>,
  ) => Promise<T>,
  +query: () => Promise<{
    +held: $ReadOnlyArray<LockInfo>,
    +pending: $ReadOnly<LockInfo>,
  }>,
};

type Lock = {
  +name: string,
  +mode: LockMode,
};

type LockInfo = {
  +name: string,
  +mode: LockMode,
  +clientID: string,
};

type LockMode = 'exclusive' | 'shared';

type WebpackHot = {
  +dispose: ((data: mixed) => void) => void,
  +removeDisposeHandler: ((data: mixed) => void) => void,
};

export { useWebLock };

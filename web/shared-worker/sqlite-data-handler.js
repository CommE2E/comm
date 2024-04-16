// @flow

import * as React from 'react';

import { cookieSelector } from 'lib/selectors/keyserver-selectors.js';
import { shouldClearData } from 'lib/shared/data-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { getCommSharedWorker } from './shared-worker-provider.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { useSelector } from '../redux/redux-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

function SQLiteDataHandler(): React.Node {
  const dispatch = useDispatch();
  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );

  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );
  const cookie = useSelector(cookieSelector(authoritativeKeyserverID));
  const currentLoggedInToAuthKeyserverUserID =
    cookie && cookie.startsWith('user=') ? currentLoggedInUserID : null;

  const handleSensitiveData = React.useCallback(async () => {
    const sharedWorker = await getCommSharedWorker();
    let currentDBUserID,
      errorGettingUserID = false;
    try {
      const currentUserData = await sharedWorker.schedule({
        type: workerRequestMessageTypes.GET_SQLITE_STAMPED_USER_ID,
      });
      currentDBUserID = currentUserData?.userID;
    } catch (error) {
      errorGettingUserID = true;
      console.error(
        `Error setting current user ID: ${
          getMessageForException(error) ?? 'unknown'
        }`,
      );
    }

    if (
      errorGettingUserID ||
      shouldClearData(currentDBUserID, currentLoggedInToAuthKeyserverUserID)
    ) {
      try {
        await sharedWorker.init({ clearDatabase: true });
      } catch (error) {
        console.error(
          `Error clearing sensitive data: ${
            getMessageForException(error) ?? 'unknown'
          }`,
        );
        // We return here to avoid assigning new user to old data
        return;
      }
    }

    if (
      currentLoggedInToAuthKeyserverUserID &&
      currentLoggedInToAuthKeyserverUserID !== currentDBUserID
    ) {
      try {
        await sharedWorker.schedule({
          type: workerRequestMessageTypes.STAMP_SQLITE_DB_USER_ID,
          userID: currentLoggedInToAuthKeyserverUserID,
        });
      } catch (error) {
        console.error(
          `Error setting current user ID: ${
            getMessageForException(error) ?? 'unknown'
          }`,
        );
      }
    }
  }, [currentLoggedInToAuthKeyserverUserID]);

  React.useEffect(() => {
    void (async () => {
      const sharedWorker = await getCommSharedWorker();

      if (!rehydrateConcluded) {
        return;
      }

      const isSupported = await sharedWorker.isSupported();
      if (!isSupported) {
        return;
      }
      await handleSensitiveData();
    })();
  }, [dispatch, handleSensitiveData, rehydrateConcluded]);

  return null;
}

export { SQLiteDataHandler };

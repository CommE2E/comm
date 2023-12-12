// @flow

import * as React from 'react';

import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { getDatabaseModule } from './database-module-provider.js';
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

  const handleSensitiveData = React.useCallback(async () => {
    const databaseModule = await getDatabaseModule();
    let currentDBUserID,
      errorGettingUserID = false;
    try {
      const currentUserData = await databaseModule.schedule({
        type: workerRequestMessageTypes.GET_CURRENT_USER_ID,
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

    if (currentDBUserID === currentLoggedInUserID && !errorGettingUserID) {
      return;
    }

    if (currentDBUserID || errorGettingUserID) {
      try {
        await databaseModule.init({ clearDatabase: true });
      } catch (error) {
        console.error(
          `Error clearing sensitive data: ${
            getMessageForException(error) ?? 'unknown'
          }`,
        );
      }
    }
    if (currentLoggedInUserID) {
      try {
        await databaseModule.schedule({
          type: workerRequestMessageTypes.SET_CURRENT_USER_ID,
          userID: currentLoggedInUserID,
        });
      } catch (error) {
        console.error(
          `Error setting current user ID: ${
            getMessageForException(error) ?? 'unknown'
          }`,
        );
      }
    }
  }, [currentLoggedInUserID]);

  React.useEffect(() => {
    void (async () => {
      const databaseModule = await getDatabaseModule();

      if (!rehydrateConcluded) {
        return;
      }

      const isSupported = await databaseModule.isDatabaseSupported();
      if (!isSupported) {
        return;
      }
      await handleSensitiveData();
    })();
  }, [dispatch, handleSensitiveData, rehydrateConcluded]);

  return null;
}

export { SQLiteDataHandler };

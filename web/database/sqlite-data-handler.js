// @flow

import * as React from 'react';

import { databaseModule } from './database-module-provider.js';
import { useSelector } from '../redux/redux-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

function SQLiteDataHandler(): React.Node {
  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated),
  );
  const currentLoggedInUserID = useSelector(state =>
    state.currentUserInfo?.anonymous ? undefined : state.currentUserInfo?.id,
  );

  const handleSensitiveData = React.useCallback(async () => {
    try {
      const currentUserData = await databaseModule.schedule({
        type: workerRequestMessageTypes.GET_CURRENT_USER_ID,
      });
      const currentDBUserID = currentUserData?.userID;

      if (currentDBUserID && currentDBUserID !== currentLoggedInUserID) {
        await databaseModule.clearSensitiveData();
      }
      if (
        currentLoggedInUserID &&
        (currentDBUserID || currentDBUserID !== currentLoggedInUserID)
      ) {
        await databaseModule.schedule({
          type: workerRequestMessageTypes.SET_CURRENT_USER_ID,
          userID: currentLoggedInUserID,
        });
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [currentLoggedInUserID]);

  React.useEffect(() => {
    (async () => {
      if (currentLoggedInUserID) {
        await databaseModule.initDBForLoggedInUser(currentLoggedInUserID);
      }
      if (!rehydrateConcluded) {
        return;
      }

      const isSupported = await databaseModule.isDatabaseSupported();
      if (!isSupported) {
        return;
      }
      await handleSensitiveData();
    })();
  }, [currentLoggedInUserID, handleSensitiveData, rehydrateConcluded]);

  return null;
}

export { SQLiteDataHandler };

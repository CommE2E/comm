// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

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
    try {
      const currentUserData = await databaseModule.schedule({
        type: workerRequestMessageTypes.GET_CURRENT_USER_ID,
      });
      const currentDBUserID = currentUserData?.userID;

      if (currentDBUserID === currentLoggedInUserID) {
        return;
      }

      if (currentDBUserID) {
        await databaseModule.init({ clearDatabase: true });
      }
      if (currentLoggedInUserID) {
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

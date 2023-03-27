// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';

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

  const loggedIn = useSelector(isLoggedIn);

  const handleSensitiveData = React.useCallback(async () => {
    try {
      const currentUserData = await databaseModule.schedule({
        type: workerRequestMessageTypes.GET_CURRENT_USER_ID,
      });

      if (
        currentUserData?.userID &&
        currentUserData.userID !== currentLoggedInUserID
      ) {
        await databaseModule.clearSensitiveData();
      }
      if (currentLoggedInUserID) {
        await databaseModule.schedule({
          type: workerRequestMessageTypes.SET_CURRENT_USER_ID,
          userID: currentLoggedInUserID,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }, [currentLoggedInUserID]);

  React.useEffect(() => {
    (async () => {
      if (currentLoggedInUserID) {
        await databaseModule.userLoggedIn(currentLoggedInUserID);
      }
      if (!rehydrateConcluded) {
        return;
      }

      const isWorkable = await databaseModule.isDatabaseWorkable();
      if (!isWorkable) {
        return;
      }
      await handleSensitiveData();
    })();
  }, [
    currentLoggedInUserID,
    handleSensitiveData,
    loggedIn,
    rehydrateConcluded,
  ]);

  return null;
}

export { SQLiteDataHandler };

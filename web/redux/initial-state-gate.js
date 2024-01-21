// @flow

import * as React from 'react';
import { PersistGate } from 'redux-persist/es/integration/react.js';
import type { Persistor } from 'redux-persist/es/types';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import type { ThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import { allUpdatesCurrentAsOfSelector } from 'lib/selectors/keyserver-selectors.js';
import { canUseDatabaseOnWeb } from 'lib/shared/web-database.js';
import type { RawThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyRawThreadInfo } from 'lib/types/thread-types.js';
import { convertIDToNewSchema } from 'lib/utils/migration-utils.js';
import { entries } from 'lib/utils/objects.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { infoFromURL } from 'lib/utils/url-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import {
  setInitialReduxState,
  useGetInitialReduxState,
} from './action-types.js';
import { useSelector } from './redux-utils.js';
import {
  getClientDBStore,
  processDBStoreOperations,
} from '../database/utils/store.js';
import Loading from '../loading.react.js';

type Props = {
  +persistor: Persistor,
  +children: React.Node,
};
function InitialReduxStateGate(props: Props): React.Node {
  const { children, persistor } = props;
  const callGetInitialReduxState = useGetInitialReduxState();
  const dispatch = useDispatch();

  const [initError, setInitError] = React.useState<?Error>(null);
  React.useEffect(() => {
    if (initError) {
      throw initError;
    }
  }, [initError]);

  const isRehydrated = useSelector(state => !!state._persist?.rehydrated);
  const allUpdatesCurrentAsOf = useSelector(allUpdatesCurrentAsOfSelector);

  const prevIsRehydrated = React.useRef(false);
  React.useEffect(() => {
    if (prevIsRehydrated.current || !isRehydrated) {
      return;
    }
    prevIsRehydrated.current = isRehydrated;
    void (async () => {
      try {
        let urlInfo = infoFromURL(decodeURI(window.location.href));
        // Handle older links
        if (urlInfo.thread) {
          urlInfo = {
            ...urlInfo,
            thread: convertIDToNewSchema(urlInfo.thread, ashoatKeyserverID),
          };
        }
        const clientDBStore = await getClientDBStore();
        dispatch({
          type: setClientDBStoreActionType,
          payload: clientDBStore,
        });

        const payload = await callGetInitialReduxState({
          urlInfo,
          excludedData: {
            threadStore: !!clientDBStore.threadStore,
          },
          allUpdatesCurrentAsOf,
        });

        const currentLoggedInUserID = payload.currentUserInfo?.anonymous
          ? null
          : payload.currentUserInfo?.id;
        const useDatabase = canUseDatabaseOnWeb(currentLoggedInUserID);

        if (!currentLoggedInUserID || !useDatabase) {
          dispatch({ type: setInitialReduxState, payload });
          return;
        }

        if (clientDBStore.threadStore) {
          const { threadStore, ...rest } = payload;
          dispatch({ type: setInitialReduxState, payload: rest });
          return;
        }

        // When there is no data in the DB, it's necessary to migrate data
        // from the keyserver payload to the DB
        const {
          threadStore: { threadInfos },
        } = payload;

        const threadStoreOperations: ThreadStoreOperation[] = entries(
          threadInfos,
        ).map(
          ([id, threadInfo]: [
            string,
            LegacyRawThreadInfo | RawThreadInfo,
          ]) => ({
            type: 'replace',
            payload: {
              id,
              threadInfo,
            },
          }),
        );

        await processDBStoreOperations(
          {
            threadStoreOperations,
            draftStoreOperations: [],
            messageStoreOperations: [],
            reportStoreOperations: [],
            userStoreOperations: [],
            keyserverStoreOperations: [],
          },
          currentLoggedInUserID,
        );

        dispatch({ type: setInitialReduxState, payload });
      } catch (err) {
        setInitError(err);
      }
    })();
  }, [callGetInitialReduxState, dispatch, isRehydrated, allUpdatesCurrentAsOf]);

  const initialStateLoaded = useSelector(state => state.initialStateLoaded);

  const childFunction = React.useCallback(
    // This argument is passed from `PersistGate`. It means that the state is
    // rehydrated and we can start fetching the initial info.
    (bootstrapped: boolean) => {
      if (bootstrapped && initialStateLoaded) {
        return children;
      } else {
        return <Loading />;
      }
    },
    [children, initialStateLoaded],
  );

  return <PersistGate persistor={persistor}>{childFunction}</PersistGate>;
}

export default InitialReduxStateGate;

// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/es/integration/react.js';
import type { Persistor } from 'redux-persist/es/types';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import type { ThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import { isStaff } from 'lib/shared/staff-utils.js';
import type { RawThreadInfo } from 'lib/types/thread-types.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { convertIDToNewSchema } from 'lib/utils/migration-utils.js';
import { entries } from 'lib/utils/objects.js';
import { infoFromURL } from 'lib/utils/url-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import {
  setInitialReduxState,
  useGetInitialReduxState,
} from './action-types.js';
import { useSelector } from './redux-utils.js';
import {
  getClientStore,
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
  const prevIsRehydrated = React.useRef(false);
  React.useEffect(() => {
    if (!prevIsRehydrated.current && isRehydrated) {
      prevIsRehydrated.current = isRehydrated;
      (async () => {
        try {
          let urlInfo = infoFromURL(decodeURI(window.location.href));
          // Handle older links
          if (urlInfo.thread) {
            urlInfo = {
              ...urlInfo,
              thread: convertIDToNewSchema(urlInfo.thread, ashoatKeyserverID),
            };
          }
          const clientDBStore = await getClientStore();

          const payload = await callGetInitialReduxState({
            urlInfo,
            excludedData: { threadStore: !!clientDBStore.threadStore },
          });

          const currentLoggedInUserID = payload.currentUserInfo?.anonymous
            ? undefined
            : payload.currentUserInfo?.id;
          const useDatabase =
            currentLoggedInUserID && (isDev || isStaff(currentLoggedInUserID));

          if (!currentLoggedInUserID || !useDatabase) {
            dispatch({ type: setInitialReduxState, payload });
            return;
          }

          if (clientDBStore.threadStore) {
            // If there is data in the DB, populate the store
            dispatch({
              type: setClientDBStoreActionType,
              payload: clientDBStore,
            });
            const { threadStore, ...rest } = payload;
            dispatch({ type: setInitialReduxState, payload: rest });
            return;
          } else {
            // When there is no data in the DB, it's necessary to migrate data
            // from the keyserver payload to the DB
            const {
              threadStore: { threadInfos },
            } = payload;

            const threadStoreOperations: ThreadStoreOperation[] = entries(
              threadInfos,
            ).map(([id, threadInfo]: [string, RawThreadInfo]) => ({
              type: 'replace',
              payload: {
                id,
                threadInfo,
              },
            }));

            await processDBStoreOperations({
              threadStoreOperations,
              draftStoreOperations: [],
              messageStoreOperations: [],
              reportStoreOperations: [],
              userStoreOperations: [],
            });
          }
          dispatch({ type: setInitialReduxState, payload });
        } catch (err) {
          setInitError(err);
        }
      })();
    }
  }, [callGetInitialReduxState, dispatch, isRehydrated]);

  const initialStateLoaded = useSelector(state => state.initialStateLoaded);

  const childFunction = React.useCallback(
    // This argument is passed from `PersistGate`. It means that the state is
    // rehydrated and we can start fetching the initial info.
    bootstrapped => {
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

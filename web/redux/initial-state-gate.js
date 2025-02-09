// @flow

import * as React from 'react';
import { PersistGate } from 'redux-persist/es/integration/react.js';
import type { Persistor } from 'redux-persist/es/types';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import type { EntryStoreOperation } from 'lib/ops/entries-store-ops.js';
import type { MessageStoreOperation } from 'lib/ops/message-store-ops.js';
import type { ThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import type { UserStoreOperation } from 'lib/ops/user-store-ops.js';
import { getMessageSearchStoreOps } from 'lib/reducers/db-ops-reducer.js';
import { allUpdatesCurrentAsOfSelector } from 'lib/selectors/keyserver-selectors.js';
import type { RawThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadIDIsThick } from 'lib/types/thread-types.js';
import { getConfig } from 'lib/utils/config.js';
import { convertIDToNewSchema } from 'lib/utils/migration-utils.js';
import { entries, values } from 'lib/utils/objects.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { infoFromURL } from 'lib/utils/url-utils.js';

import {
  setInitialReduxState,
  useGetInitialReduxState,
} from './action-types.js';
import { useSelector } from './redux-utils.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import Loading from '../loading.react.js';
import { getClientDBStore } from '../shared-worker/utils/store.js';
import type { InitialReduxStateActionPayload } from '../types/redux-types.js';

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
        const isThickThreadOpen =
          urlInfo.thread && threadIDIsThick(urlInfo.thread);
        // Handle older links
        if (urlInfo.thread && !isThickThreadOpen) {
          urlInfo = {
            ...urlInfo,
            thread: convertIDToNewSchema(
              urlInfo.thread,
              authoritativeKeyserverID,
            ),
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
            messageStore: !!clientDBStore.messages,
            userStore: !!clientDBStore.users,
            entryStore: !!clientDBStore.entries,
          },
          allUpdatesCurrentAsOf,
        });

        if (isThickThreadOpen) {
          payload.navInfo.activeChatThreadID = urlInfo.thread;
        }

        const currentLoggedInUserID = payload.currentUserInfo?.anonymous
          ? null
          : payload.currentUserInfo?.id;

        if (!currentLoggedInUserID) {
          dispatch({ type: setInitialReduxState, payload });
          return;
        }

        let initialReduxState: InitialReduxStateActionPayload = payload;

        let threadStoreOperations: ThreadStoreOperation[] = [];
        if (clientDBStore.threadStore) {
          const { threadStore, ...rest } = initialReduxState;
          initialReduxState = rest;
        } else {
          // When there is no data in the DB, it's necessary to migrate data
          // from the keyserver payload to the DB
          threadStoreOperations = entries(payload.threadStore.threadInfos).map(
            ([id, threadInfo]: [string, RawThreadInfo]) => ({
              type: 'replace',
              payload: {
                id,
                threadInfo,
              },
            }),
          );
        }

        let userStoreOperations: UserStoreOperation[] = [];
        if (clientDBStore.users) {
          const { userInfos, ...rest } = initialReduxState;
          initialReduxState = rest;
        } else {
          userStoreOperations = values(payload.userInfos).map(userInfo => ({
            type: 'replace_user',
            payload: userInfo,
          }));
        }

        let messageStoreOperations: MessageStoreOperation[] = [];
        if (clientDBStore.messages) {
          const { messageStore, ...rest } = initialReduxState;
          initialReduxState = rest;
        } else {
          const { messages, threads } = payload.messageStore;

          messageStoreOperations = [
            ...entries(messages).map(([id, messageInfo]) => ({
              type: 'replace',
              payload: { id, messageInfo },
            })),
            {
              type: 'replace_threads',
              payload: { threads },
            },
          ];
        }

        let entryStoreOperations: Array<EntryStoreOperation> = [];
        if (clientDBStore.entries) {
          const { entryStore, ...rest } = initialReduxState;
          initialReduxState = rest;
        } else {
          entryStoreOperations = entries(payload.entryStore.entryInfos).map(
            ([id, entry]) => ({
              type: 'replace_entry',
              payload: { id, entry },
            }),
          );
        }

        if (
          threadStoreOperations.length > 0 ||
          userStoreOperations.length > 0 ||
          messageStoreOperations.length > 0 ||
          entryStoreOperations.length > 0
        ) {
          const messageSearchStoreOperations = getMessageSearchStoreOps(
            messageStoreOperations,
          );
          const { sqliteAPI } = getConfig();
          await sqliteAPI.processDBStoreOperations({
            threadStoreOperations,
            draftStoreOperations: [],
            messageStoreOperations,
            reportStoreOperations: [],
            userStoreOperations,
            keyserverStoreOperations: [],
            communityStoreOperations: [],
            integrityStoreOperations: [],
            syncedMetadataStoreOperations: [],
            auxUserStoreOperations: [],
            threadActivityStoreOperations: [],
            entryStoreOperations,
            messageSearchStoreOperations,
          });
        }

        dispatch({
          type: setInitialReduxState,
          payload: initialReduxState,
        });
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

// @flow

import * as React from 'react';

import {
  useFetchCommunityInfos,
  fetchCommunityInfosActionTypes,
} from '../actions/community-actions.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { threadTypeIsCommunityRoot } from '../types/thread-types-enum.js';
import { FetchTimeout } from '../utils/errors.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function SyncCommunityStoreHandler(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const communityInfos = useSelector(
    state => state.communityStore.communityInfos,
  );
  const callFetchCommunityInfos = useFetchCommunityInfos();
  const dispatchActionPromise = useDispatchActionPromise();

  const requestedCommunityInfosRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const communityRootThreads = Object.values(threadInfos).filter(thread =>
      threadTypeIsCommunityRoot(thread.type),
    );

    const missingCommunityInfos = communityRootThreads.filter(
      thread =>
        !(thread.id in communityInfos) &&
        !requestedCommunityInfosRef.current.has(thread.id),
    );

    if (missingCommunityInfos.length === 0) {
      return;
    }

    missingCommunityInfos.forEach(thread =>
      requestedCommunityInfosRef.current.add(thread.id),
    );

    const fetchCommunityInfosPromise = (async () => {
      try {
        return await callFetchCommunityInfos();
      } catch (e) {
        if (e instanceof FetchTimeout) {
          missingCommunityInfos.forEach(thread =>
            requestedCommunityInfosRef.current.delete(thread.id),
          );
        }
        throw e;
      }
    })();
    void dispatchActionPromise(
      fetchCommunityInfosActionTypes,
      fetchCommunityInfosPromise,
    );
  }, [
    callFetchCommunityInfos,
    communityInfos,
    dispatchActionPromise,
    loggedIn,
    threadInfos,
  ]);

  return null;
}

export default SyncCommunityStoreHandler;

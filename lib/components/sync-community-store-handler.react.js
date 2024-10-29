// @flow

import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import {
  useFetchCommunityInfos,
  fetchCommunityInfosActionTypes,
} from '../actions/community-actions.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { thinThreadTypes } from '../types/thread-types-enum.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const FETCH_COMMUNITY_INFOS_DEBOUNCE_DURATION = 5000;

function SyncCommunityStoreHandler(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const communityInfos = useSelector(
    state => state.communityStore.communityInfos,
  );
  const callFetchCommunityInfos = useFetchCommunityInfos();
  const dispatchActionPromise = useDispatchActionPromise();

  const debouncedFetchCommunityInfos = React.useMemo(
    () =>
      _debounce(() => {
        void dispatchActionPromise(
          fetchCommunityInfosActionTypes,
          callFetchCommunityInfos(),
        );
      }, FETCH_COMMUNITY_INFOS_DEBOUNCE_DURATION),
    [callFetchCommunityInfos, dispatchActionPromise],
  );

  React.useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const communityRootThreads = Object.values(threadInfos).filter(
      thread => thread.type === thinThreadTypes.COMMUNITY_ROOT,
    );

    const missingCommunityInfos = communityRootThreads.some(
      thread => !(thread.id in communityInfos),
    );

    if (missingCommunityInfos) {
      debouncedFetchCommunityInfos();
    }
  }, [communityInfos, debouncedFetchCommunityInfos, loggedIn, threadInfos]);

  return null;
}

export default SyncCommunityStoreHandler;

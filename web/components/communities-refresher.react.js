// @flow

import * as React from 'react';

import {
  fetchCommunityInfosActionTypes,
  useFetchCommunityInfos,
} from 'lib/actions/community-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useSelector } from '../redux/redux-utils.js';

function CommunitiesRefresher(): React.Node {
  const isActive = useSelector(state => state.windowActive);
  const loggedIn = useSelector(isLoggedIn);
  const callFetchCommunityInfos = useFetchCommunityInfos();
  const dispatchActionPromise = useDispatchActionPromise();

  React.useEffect(() => {
    if (!isActive || !loggedIn) {
      return;
    }
    void dispatchActionPromise(
      fetchCommunityInfosActionTypes,
      callFetchCommunityInfos(),
    );
  }, [callFetchCommunityInfos, dispatchActionPromise, isActive, loggedIn]);

  return null;
}

export default CommunitiesRefresher;

// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import {
  alertTypes,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import type { CommunityInfos } from 'lib/types/community-types.js';
import { shouldSkipJoinCommunityAlert } from 'lib/utils/push-alerts.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import sleep from 'lib/utils/sleep.js';

import { CommunityJoinerModalRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function JoinCommunityAlertHandler(): React.Node {
  const { navigate } = useNavigation();

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  const joinCommunityAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.JOIN_COMMUNITY],
  );

  const communityInfos: CommunityInfos = useSelector(
    state => state.communityStore.communityInfos,
  );

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (
      !loggedIn ||
      !isActive ||
      shouldSkipJoinCommunityAlert(joinCommunityAlertInfo) ||
      Object.keys(communityInfos).length > 3
    ) {
      return;
    }

    void (async () => {
      await sleep(1000);

      navigate(CommunityJoinerModalRouteName);

      const payload: RecordAlertActionPayload = {
        alertType: alertTypes.JOIN_COMMUNITY,
        time: Date.now(),
      };

      dispatch({
        type: recordAlertActionType,
        payload,
      });
    })();
  }, [
    communityInfos,
    dispatch,
    isActive,
    joinCommunityAlertInfo,
    loggedIn,
    navigate,
  ]);

  return null;
}

export default JoinCommunityAlertHandler;

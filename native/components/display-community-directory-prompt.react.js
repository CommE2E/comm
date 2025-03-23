// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import {
  fetchNativeDrawerAndDirectoryInfosActionTypes,
  fetchNativeDrawerAndDirectoryInfos,
} from 'lib/actions/community-actions.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { viewerIsMember } from 'lib/shared/thread-utils.js';
import {
  alertTypes,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import type { CommunityInfos } from 'lib/types/community-types.js';
import { millisecondsInDay } from 'lib/utils/date-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { useCurrentLeafRouteName } from '../navigation/nav-selectors.js';
import {
  DirectoryPromptBottomSheetRouteName,
  HomeChatThreadListRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { showCommunityDirectory } from '../utils/directory-utils.js';

function DisplayCommunityDirectoryPromptHandler(): React.Node {
  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();
  const isActive = useSelector(state => state.lifecycleState !== 'background');
  const fid = useCurrentUserFID();
  const communityInfos: CommunityInfos = useSelector(
    state => state.communityStore.communityInfos,
  );
  const coldStartCount = useSelector(state => state.alertStore.coldStartCount);
  const displayDirectoryPromptAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.DISPLAY_DIRECTORY_PROMPT],
  );
  const connectFarcasterAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.CONNECT_FARCASTER],
  );
  const currentRoute = useCurrentLeafRouteName();

  const lastConnectFarcasterAlert = connectFarcasterAlertInfo.lastAlertTime;
  const recentConnectFarcasterAlert =
    Date.now() - lastConnectFarcasterAlert < millisecondsInDay;

  if (
    isDev ||
    !showCommunityDirectory ||
    !loggedIn ||
    !isActive ||
    fid !== null ||
    Object.keys(communityInfos).length > 4 ||
    coldStartCount < 2 ||
    displayDirectoryPromptAlertInfo.totalAlerts > 0 ||
    currentRoute !== HomeChatThreadListRouteName ||
    recentConnectFarcasterAlert ||
    connectFarcasterAlertInfo.totalAlerts === 0
  ) {
    return null;
  }

  return <DisplayCommunityDirectoryPromptHandlerInner />;
}

function DisplayCommunityDirectoryPromptHandlerInner(): React.Node {
  const { navigate } = useNavigation();
  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const hasShownDirectoryPrompt = React.useRef(false);
  const fetchPromise = useLegacyAshoatKeyserverCall(
    fetchNativeDrawerAndDirectoryInfos,
  )();

  React.useEffect(() => {
    if (hasShownDirectoryPrompt.current) {
      return;
    }
    hasShownDirectoryPrompt.current = true;

    void dispatchActionPromise(
      fetchNativeDrawerAndDirectoryInfosActionTypes,
      fetchPromise,
    );

    void (async () => {
      const response = await fetchPromise;
      const fetchedCommunities = response.allCommunityInfosWithNames.filter(
        community => !viewerIsMember(community.threadInfo),
      );

      navigate<'DirectoryPromptBottomSheet'>({
        name: DirectoryPromptBottomSheetRouteName,
        params: { communities: fetchedCommunities },
      });

      const payload: RecordAlertActionPayload = {
        alertType: alertTypes.DISPLAY_DIRECTORY_PROMPT,
        time: Date.now(),
      };

      dispatch({
        type: recordAlertActionType,
        payload,
      });
    })();
  }, [dispatch, dispatchActionPromise, fetchPromise, navigate]);
}

export default DisplayCommunityDirectoryPromptHandler;

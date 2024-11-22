// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import {
  fetchAllCommunityInfosWithNamesActionTypes,
  fetchAllCommunityInfosWithNames,
} from 'lib/actions/community-actions.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import type { CommunityInfos } from 'lib/types/community-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { DirectoryPromptBottomSheetRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOnFirstLaunchEffect } from '../utils/hooks.js';

function DisplayCommunityDirectoryPromptHandler(): React.Node {
  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();
  const lifecycleState = useSelector(state => state.lifecycleState);
  const isActive = lifecycleState !== 'background';
  const fid = useCurrentUserFID();
  const communityInfos: CommunityInfos = useSelector(
    state => state.communityStore.communityInfos,
  );

  const prevLifecycleStateRef = React.useRef<?string>();
  const [foregroundCount, setForegroundCount] = React.useState(0);

  React.useEffect(() => {
    if (
      prevLifecycleStateRef.current === 'background' &&
      lifecycleState === 'active'
    ) {
      setForegroundCount(prev => prev + 1);
    }
    prevLifecycleStateRef.current = lifecycleState;
  }, [lifecycleState]);

  const prevCanQueryRef = React.useRef<?boolean>();
  const canQuery = isActive && loggedIn;

  if (canQuery === prevCanQueryRef.current) {
    return null;
  }
  prevCanQueryRef.current = canQuery;

  if (
    !loggedIn ||
    !isActive ||
    fid !== null ||
    Object.keys(communityInfos).length > 3 ||
    foregroundCount < 1
  ) {
    return null;
  }

  return <DisplayCommunityDirectoryPromptHandlerInner />;
}

function DisplayCommunityDirectoryPromptHandlerInner(): React.Node {
  const { navigate } = useNavigation();
  const dispatchActionPromise = useDispatchActionPromise();
  const fetchPromise = useLegacyAshoatKeyserverCall(
    fetchAllCommunityInfosWithNames,
  );

  const effect = React.useCallback(async () => {
    void dispatchActionPromise(
      fetchAllCommunityInfosWithNamesActionTypes,
      fetchPromise(),
    );
    const response = await fetchPromise();
    const fetchedCommunities = response.allCommunityInfosWithNames;

    navigate<'DirectoryPromptBottomSheet'>({
      name: DirectoryPromptBottomSheetRouteName,
      params: { communities: fetchedCommunities },
    });
  }, [dispatchActionPromise, fetchPromise, navigate]);

  useOnFirstLaunchEffect('JOIN_COMMUNITY_ALERT', effect);
}

export default DisplayCommunityDirectoryPromptHandler;

// @flow

import { CommonActions } from '@react-navigation/core';
import * as React from 'react';

import { useIsUserDataReady } from 'lib/hooks/backup-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useLightweightSyncOnAppStart } from 'lib/shared/farcaster/farcaster-hooks.js';
import {
  useCurrentUserSupportsDCs,
  useFarcasterDCsLoaded,
  useFarcasterDCsSyncCanceled,
} from 'lib/utils/farcaster-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import { useCurrentLeafRouteName } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { FarcasterSyncScreenRouteName } from '../navigation/route-names.js';

function FarcasterSyncHandler(): React.Node {
  const navContext = React.useContext(NavContext);

  const isUserLoggedIn = useSelector(isLoggedIn);
  const userDataReady = useIsUserDataReady();
  const fullyLoggedIn = isUserLoggedIn && userDataReady;

  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const farcasterDCsLoaded = useFarcasterDCsLoaded();
  const isFarcasterSyncCanceled = useFarcasterDCsSyncCanceled();
  const currentRouteName = useCurrentLeafRouteName();

  useLightweightSyncOnAppStart();

  React.useEffect(() => {
    if (!navContext) {
      return;
    }

    const { dispatch } = navContext;

    if (
      fullyLoggedIn &&
      currentUserSupportsDCs &&
      farcasterDCsLoaded === false &&
      currentRouteName !== FarcasterSyncScreenRouteName &&
      !isFarcasterSyncCanceled
    ) {
      dispatch(
        CommonActions.navigate({
          name: FarcasterSyncScreenRouteName,
        }),
      );
    }
  }, [
    navContext,
    userDataReady,
    currentUserSupportsDCs,
    farcasterDCsLoaded,
    currentRouteName,
    fullyLoggedIn,
    isFarcasterSyncCanceled,
  ]);

  return null;
}

export default FarcasterSyncHandler;

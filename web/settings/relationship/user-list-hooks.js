// @flow

import * as React from 'react';

import { useENSNames } from 'lib/hooks/ens-cache.js';
import type {
  AccountUserInfo,
  GlobalAccountUserInfo,
} from 'lib/types/user-types';

function useSortedENSResolvedUsers(
  userInfos: $ReadOnlyArray<GlobalAccountUserInfo | AccountUserInfo>,
): $ReadOnlyArray<GlobalAccountUserInfo | AccountUserInfo> {
  const ensReslovedUsers = useENSNames(userInfos);

  return React.useMemo(
    () =>
      ensReslovedUsers.sort((userInfo1, userInfo2) =>
        userInfo1.username.localeCompare(userInfo2.username),
      ),
    [ensReslovedUsers],
  );
}

export { useSortedENSResolvedUsers };

// @flow

import * as React from 'react';

import { useENSNames } from 'lib/hooks/ens-cache.js';
import { stringForUser } from 'lib/shared/user-utils.js';

type BaseENSResolvedUser = { +username?: ?string, +isViewer?: ?boolean, ... };
function useSortedENSResolvedUsers<T: BaseENSResolvedUser>(
  userInfos: $ReadOnlyArray<T>,
): $ReadOnlyArray<T> {
  const ensResolvedUsers = useENSNames(userInfos);

  return React.useMemo(
    () =>
      ensResolvedUsers.sort((userInfo1, userInfo2) =>
        stringForUser(userInfo1).localeCompare(stringForUser(userInfo2)),
      ),
    [ensResolvedUsers],
  );
}

export { useSortedENSResolvedUsers };

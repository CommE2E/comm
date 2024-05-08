// @flow

import * as React from 'react';

import { useSelector } from '../utils/redux-utils.js';
import {
  relyingOnAuthoritativeKeyserver,
  usingCommServicesAccessToken,
} from '../utils/services-utils.js';

function UserInfosHandler(): React.Node {
  const userInfos = useSelector(state => state.userStore.userInfos);

  const userInfosWithMissingUsernames = React.useMemo(() => {
    const entriesWithoutUsernames = Object.entries(userInfos).filter(
      ([, value]) => !value.username,
    );
    return Object.fromEntries(entriesWithoutUsernames);
  }, [userInfos]);

  React.useEffect(() => {
    if (!usingCommServicesAccessToken) {
      return;
    }
    // 1. TODO: fetch usernames from identity

    // 2. Fetch avatars and settings from auth keyserver
    if (relyingOnAuthoritativeKeyserver) {
      // TODO
    }
  }, [userInfosWithMissingUsernames]);
}

export { UserInfosHandler };

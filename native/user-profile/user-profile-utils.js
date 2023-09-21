// @flow

import { useNavigation } from '@react-navigation/native';
import _throttle from 'lodash/throttle.js';
import * as React from 'react';

import {
  UserProfileBottomSheetRouteName,
  UserProfileBottomSheetNavigatorRouteName,
} from '../navigation/route-names.js';

function useNavigateToUserProfileBottomSheet(): (userID: string) => mixed {
  const { navigate } = useNavigation();

  return React.useMemo(
    () =>
      _throttle(
        (userID: string) => {
          navigate<'UserProfileBottomSheetNavigator'>(
            UserProfileBottomSheetNavigatorRouteName,
            {
              screen: UserProfileBottomSheetRouteName,
              params: {
                userID,
              },
              key: `${UserProfileBottomSheetNavigatorRouteName}|${UserProfileBottomSheetRouteName}|${userID}`,
            },
          );
        },
        500, // 500ms throttle delay
        {
          leading: true,
          trailing: false,
        },
      ),
    [navigate],
  );
}

export { useNavigateToUserProfileBottomSheet };

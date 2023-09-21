// @flow

import { useNavigation } from '@react-navigation/native';
import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import {
  UserProfileBottomSheetRouteName,
  UserProfileBottomSheetNavigatorRouteName,
} from '../navigation/route-names.js';

function useNavigateToUserProfileBottomSheet(): (userID: string) => mixed {
  const { navigate } = useNavigation();

  return React.useMemo(
    () =>
      _debounce(
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
        500, // 500ms debounce delay
        {
          leading: true,
          trailing: false,
        },
      ),
    [navigate],
  );
}

export { useNavigateToUserProfileBottomSheet };

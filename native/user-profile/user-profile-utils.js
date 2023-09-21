// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { UserProfileBottomSheetRouteName } from '../navigation/route-names.js';

function useNavigateToUserProfileBottomSheet(): (userID: string) => mixed {
  const { navigate } = useNavigation();

  return React.useCallback(
    (userID: string) => {
      navigate<'UserProfileBottomSheet'>({
        name: UserProfileBottomSheetRouteName,
        params: {
          userID,
        },
      });
    },
    [navigate],
  );
}

export { useNavigateToUserProfileBottomSheet };

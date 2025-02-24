// @flow

import { useNavigation } from '@react-navigation/core';
import * as React from 'react';

import { logInActionType } from './action-types.js';

function usePreventUserFromLeavingScreen(condition: boolean) {
  const navigation = useNavigation();
  React.useEffect(() => {
    if (!condition) {
      return undefined;
    }
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: null,
    });
    const removeListener = navigation.addListener('beforeRemove', e => {
      if (e.data.action.type !== logInActionType) {
        e.preventDefault();
      }
    });
    return () => {
      navigation.setOptions({
        gestureEnabled: true,
        headerLeft: undefined,
      });
      removeListener();
    };
  }, [condition, navigation]);
}

export { usePreventUserFromLeavingScreen };

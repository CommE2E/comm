// @flow

import * as React from 'react';
import {
  initialMode as initialSystemTheme,
  eventEmitter as systemThemeEventEmitter,
} from 'react-native-dark-mode';
import { useDispatch } from 'react-redux';

import type { Shape } from 'lib/types/core';

import { updateThemeInfoActionType } from '../redux/action-types';
import { useSelector } from '../redux/redux-utils';
import {
  type GlobalTheme,
  type GlobalThemeInfo,
  osCanTheme,
} from '../types/themes';

function ThemeHandler() {
  const globalThemeInfo = useSelector(state => state.globalThemeInfo);
  const dispatch = useDispatch();
  const updateSystemTheme = React.useCallback(
    (colorScheme: GlobalTheme) => {
      if (globalThemeInfo.systemTheme === colorScheme) {
        return;
      }

      let updateObject: Shape<GlobalThemeInfo> = {
        systemTheme: colorScheme,
      };
      if (globalThemeInfo.preference === 'system') {
        updateObject = { ...updateObject, activeTheme: colorScheme };
      }

      dispatch({
        type: updateThemeInfoActionType,
        payload: updateObject,
      });
    },
    [globalThemeInfo, dispatch],
  );

  React.useEffect(() => {
    if (!osCanTheme) {
      return undefined;
    }
    systemThemeEventEmitter.addListener(
      'currentModeChanged',
      updateSystemTheme,
    );
    return () => {
      systemThemeEventEmitter.removeListener(
        'currentModeChanged',
        updateSystemTheme,
      );
    };
  }, [updateSystemTheme]);

  React.useEffect(
    () => updateSystemTheme(initialSystemTheme),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return null;
}

export default ThemeHandler;

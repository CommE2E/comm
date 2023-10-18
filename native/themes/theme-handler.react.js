// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Appearance } from 'react-native';
import { useDispatch } from 'react-redux';

import type { Shape } from 'lib/types/core.js';

import { updateThemeInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  type GlobalTheme,
  type GlobalThemeInfo,
  osCanTheme,
} from '../types/themes.js';

function ThemeHandler(): null {
  const globalThemeInfo = useSelector(state => state.globalThemeInfo);
  const dispatch = useDispatch();
  const updateSystemTheme = React.useCallback(
    (colorScheme: ?GlobalTheme) => {
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
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      invariant(
        colorScheme === undefined ||
          colorScheme === null ||
          colorScheme === 'light' ||
          colorScheme === 'dark',
        'Flow types for Appearance module are non-specific',
      );
      updateSystemTheme(colorScheme);
    });
    return () => subscription.remove();
  }, [updateSystemTheme]);

  React.useEffect(
    () => updateSystemTheme(Appearance.getColorScheme()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return null;
}

export default ThemeHandler;

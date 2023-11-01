// @flow

import * as React from 'react';

import { updateThemeInfoActionType } from '../actions/theme-actions.js';
import type { Shape } from '../types/core.js';
import type {
  GlobalTheme,
  GlobalThemeInfo,
  GlobalThemePreference,
} from '../types/theme-types.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

function useUpdateSystemTheme(): (colorScheme: ?GlobalTheme) => mixed {
  const globalThemeInfo = useSelector(state => state.globalThemeInfo);
  const dispatch = useDispatch();

  return React.useCallback(
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
}

function useUpdateThemePreference(): (
  themePreference: GlobalThemePreference,
) => mixed {
  const globalThemeInfo = useSelector(state => state.globalThemeInfo);
  const dispatch = useDispatch();

  return React.useCallback(
    (themePreference: GlobalThemePreference) => {
      if (themePreference === globalThemeInfo.preference) {
        return;
      }

      let theme = themePreference;
      if (themePreference === 'system') {
        theme = globalThemeInfo.systemTheme;
      }

      dispatch({
        type: updateThemeInfoActionType,
        payload: {
          preference: themePreference,
          activeTheme: theme,
        },
      });
    },
    [globalThemeInfo, dispatch],
  );
}

export { useUpdateSystemTheme, useUpdateThemePreference };

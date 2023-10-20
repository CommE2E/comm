// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateThemeInfoActionType } from '../actions/theme-actions.js';
import type { Shape } from '../types/core.js';
import type { GlobalTheme, GlobalThemeInfo } from '../types/theme-types.js';
import { useSelector } from '../utils/redux-utils.js';

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

export { useUpdateSystemTheme };

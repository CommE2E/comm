// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Appearance } from 'react-native';

import { useUpdateSystemTheme } from 'lib/hooks/theme.js';

import { osCanTheme } from '../themes/theme-utils.js';

function ThemeHandler(): null {
  const updateSystemTheme = useUpdateSystemTheme();

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
    () => {
      const colorScheme = Appearance.getColorScheme();
      updateSystemTheme(colorScheme === 'unspecified' ? null : colorScheme);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return null;
}

export default ThemeHandler;

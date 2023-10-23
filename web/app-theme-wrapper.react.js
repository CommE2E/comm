// @flow

import * as React from 'react';

import { useSelector } from './redux/redux-utils.js';
import css from './style.css';

type Props = {
  +children: React.Node,
};

function AppThemeWrapper(props: Props): React.Node {
  const { children } = props;

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const theme = activeTheme ? activeTheme : 'light';

  const appThemeWrapper = React.useMemo(
    () => (
      <div data-theme={theme} className={css.appThemeContainer}>
        {children}
      </div>
    ),
    [children, theme],
  );

  return appThemeWrapper;
}

export default AppThemeWrapper;

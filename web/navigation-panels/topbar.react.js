// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import AppSwitcher from './app-switcher.react.js';
import css from './topbar.css';
import { updateNavInfoActionType } from '../redux/action-types.js';

function Topbar(): React.Node {
  const dispatch = useDispatch();

  const onClickApps = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          tab: 'apps',
        },
      });
    },
    [dispatch],
  );

  const appNavigationItem = React.useMemo(
    () => (
      <a className={css.plusButton} onClick={onClickApps}>
        <SWMansionIcon icon="plus-small" size={24} />
      </a>
    ),
    [onClickApps],
  );

  return (
    <div className={css.container}>
      <AppSwitcher />
      {appNavigationItem}
    </div>
  );
}

const MemoizedTopbar: React.ComponentType<{}> = React.memo<{}>(Topbar);

export default MemoizedTopbar;

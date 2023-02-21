// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import AppSwitcher from './app-switcher.react.js';
import css from './topbar.css';
import AppsDirectory from '../modals/apps/apps-directory-modal.react.js';

function Topbar(): React.Node {
  const modalContext = useModalContext();

  const onClickApps = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      modalContext.pushModal(<AppsDirectory />);
    },
    [modalContext],
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
      <div className={css.tabs}>
        <AppSwitcher />
      </div>
      {appNavigationItem}
    </div>
  );
}

const MemoizedTopbar: React.ComponentType<{}> = React.memo<{}>(Topbar);

export default MemoizedTopbar;

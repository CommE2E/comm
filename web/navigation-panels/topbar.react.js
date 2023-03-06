// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import AppSwitcher from './app-switcher.react.js';
import NavStateInfoBar from './nav-state-info-bar.react.js';
import css from './topbar.css';
import Button from '../components/button.react.js';
import AppsDirectory from '../modals/apps/apps-directory-modal.react.js';
import { useDrawerSelectedThreadID } from '../selectors/thread-selectors.js';
import { useThreadInfoForPossiblyPendingThread } from '../utils/thread-utils.js';

function Topbar(): React.Node {
  const { pushModal } = useModalContext();

  const onClickApps = React.useCallback(
    () => pushModal(<AppsDirectory />),
    [pushModal],
  );

  const appNavigationItem = React.useMemo(
    () => (
      <Button className={css.plusButton} onClick={onClickApps}>
        <SWMansionIcon icon="plus-small" size={24} />
      </Button>
    ),
    [onClickApps],
  );

  const activeChatThreadID = useDrawerSelectedThreadID();
  const threadInfo = useThreadInfoForPossiblyPendingThread(activeChatThreadID);

  return (
    <>
      <NavStateInfoBar threadInfoInput={threadInfo} />
      <div className={css.container}>
        <div className={css.tabs}>
          <AppSwitcher />
        </div>
        {appNavigationItem}
      </div>
    </>
  );
}

const MemoizedTopbar: React.ComponentType<{}> = React.memo<{}>(Topbar);

export default MemoizedTopbar;

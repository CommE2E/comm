// @flow

import * as React from 'react';

import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';

import AppSwitcher from './app-switcher.react.js';
import NavStateInfoBar from './nav-state-info-bar.react.js';
import css from './topbar.css';
import { useDrawerSelectedThreadID } from '../selectors/thread-selectors.js';
import { useThreadInfoForPossiblyPendingThread } from '../utils/thread-utils.js';

function Topbar(): React.Node {
  const activeChatThreadID = useDrawerSelectedThreadID();
  const { selectedProtocol } = useProtocolSelection();
  const threadInfo = useThreadInfoForPossiblyPendingThread(
    activeChatThreadID,
    selectedProtocol,
  );

  return (
    <>
      <NavStateInfoBar threadInfoInput={threadInfo} />
      <div className={css.container}>
        <div className={css.tabs}>
          <AppSwitcher />
        </div>
      </div>
    </>
  );
}

const MemoizedTopbar: React.ComponentType<{}> = React.memo(Topbar);

export default MemoizedTopbar;

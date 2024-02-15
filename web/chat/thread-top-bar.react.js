// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import PinnedMessagesBanner from './pinned-messages-banner.react.js';
import ThreadMenu from './thread-menu.react.js';
import css from './thread-top-bar.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import Button from '../components/button.react.js';
import { InputStateContext } from '../input/input-state.js';
import MessageSearchModal from '../modals/search/message-search-modal.react.js';

type ThreadTopBarProps = {
  +threadInfo: ThreadInfo,
};
function ThreadTopBar(props: ThreadTopBarProps): React.Node {
  const { threadInfo } = props;
  const { pushModal } = useModalContext();

  let threadMenu = null;
  if (!threadIsPending(threadInfo.id)) {
    threadMenu = <ThreadMenu threadInfo={threadInfo} />;
  }

  const inputState = React.useContext(InputStateContext);

  const onClickSearch = React.useCallback(
    () =>
      pushModal(
        <InputStateContext.Provider value={inputState}>
          <MessageSearchModal threadInfo={threadInfo} />
        </InputStateContext.Provider>,
      ),
    [inputState, pushModal, threadInfo],
  );

  const { uiName } = useResolvedThreadInfo(threadInfo);

  return (
    <>
      <div className={css.topBarContainer}>
        <div className={css.topBarThreadInfo}>
          <ThreadAvatar size="S" threadInfo={threadInfo} />
          <div className={css.threadTitle}>{uiName}</div>
        </div>
        <div className={css.buttons}>
          <Button className={css.button} onClick={onClickSearch}>
            <SWMansionIcon
              size={24}
              icon="search"
              className={css.searchButtonIcon}
            />
          </Button>
          {threadMenu}
        </div>
      </div>
      <PinnedMessagesBanner threadInfo={threadInfo} />
    </>
  );
}

export default ThreadTopBar;

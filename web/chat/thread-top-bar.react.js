// @flow

import * as React from 'react';
import { ChevronRight } from 'react-feather';

import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';

import ThreadMenu from './thread-menu.react.js';
import ThreadPinnedMessagesModal from '../modals/chat/thread-pinned-messages-modal.react.js';
import css from './thread-top-bar.css';
import ThreadAvatar from '../components/thread-avatar.react.js';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';
import { InputStateContext } from '../input/input-state.js';

type ThreadTopBarProps = {
  +threadInfo: ThreadInfo,
};
function ThreadTopBar(props: ThreadTopBarProps): React.Node {
  const { threadInfo } = props;
  const { pushModal } = useModalContext();
  const threadBackgroundColorStyle = React.useMemo(
    () => ({
      background: `#${threadInfo.color}`,
    }),
    [threadInfo.color],
  );

  let threadMenu = null;
  if (!threadIsPending(threadInfo.id)) {
    threadMenu = <ThreadMenu threadInfo={threadInfo} />;
  }

  const inputState = React.useContext(InputStateContext);

  const pushThreadPinsModal = React.useCallback(() => {
    pushModal(
      <InputStateContext.Provider value={inputState}>
        <ThreadPinnedMessagesModal threadInfo={threadInfo} />
      </InputStateContext.Provider>,
    );
  }, [pushModal, inputState, threadInfo]);

  const pinnedCountBanner = React.useMemo(() => {
    if (!threadInfo.pinnedCount || threadInfo.pinnedCount === 0) {
      return null;
    }

    const singleOrPlural =
      threadInfo.pinnedCount === 1 ? 'message' : 'messages';

    return (
      <div className={css.pinnedCountBanner}>
        <span className={css.pinnedCountText} onClick={pushThreadPinsModal}>
          {threadInfo.pinnedCount} pinned {singleOrPlural}
          <ChevronRight size={14} className={css.chevronRight} />
        </span>
      </div>
    );
  }, [threadInfo.pinnedCount, pushThreadPinsModal]);

  const { uiName } = useResolvedThreadInfo(threadInfo);

  const avatar = React.useMemo(() => {
    if (!shouldRenderAvatars) {
      return (
        <div
          className={css.threadColorSquare}
          style={threadBackgroundColorStyle}
        />
      );
    }
    return <ThreadAvatar size="small" threadInfo={threadInfo} />;
  }, [threadBackgroundColorStyle, threadInfo]);

  return (
    <>
      <div className={css.topBarContainer}>
        <div className={css.topBarThreadInfo}>
          {avatar}
          <div className={css.threadTitle}>{uiName}</div>
        </div>
        {threadMenu}
      </div>
      {pinnedCountBanner}
    </>
  );
}

export default ThreadTopBar;

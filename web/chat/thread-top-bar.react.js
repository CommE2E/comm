// @flow

import * as React from 'react';
import { ChevronRight } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import ThreadMenu from './thread-menu.react.js';
import css from './thread-top-bar.css';
import ThreadAvatar from '../components/thread-avatar.react.js';
import { InputStateContext } from '../input/input-state.js';
import MessageResultsModal from '../modals/chat/message-results-modal.react.js';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';

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

  // To allow the pinned messages modal to be re-used by the message search
  // modal, it will be useful to make the modal accept a prop that defines it's
  // name, instead of setting it directly in the modal.
  const bannerText = React.useMemo(() => {
    if (!threadInfo.pinnedCount || threadInfo.pinnedCount === 0) {
      return '';
    }

    const messageNoun = threadInfo.pinnedCount === 1 ? 'message' : 'messages';

    return `${threadInfo.pinnedCount} pinned ${messageNoun}`;
  }, [threadInfo.pinnedCount]);

  const inputState = React.useContext(InputStateContext);
  const pushThreadPinsModal = React.useCallback(() => {
    pushModal(
      <InputStateContext.Provider value={inputState}>
        <MessageResultsModal threadInfo={threadInfo} modalName={bannerText} />
      </InputStateContext.Provider>,
    );
  }, [pushModal, inputState, threadInfo, bannerText]);

  const pinnedCountBanner = React.useMemo(() => {
    if (!bannerText) {
      return null;
    }

    return (
      <div className={css.pinnedCountBanner}>
        <a className={css.pinnedCountText} onClick={pushThreadPinsModal}>
          {bannerText}
          <ChevronRight size={14} className={css.chevronRight} />
        </a>
      </div>
    );
  }, [bannerText, pushThreadPinsModal]);

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

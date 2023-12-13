// @flow

import * as React from 'react';
import { ChevronRight } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { pinnedMessageCountText } from 'lib/utils/message-pinning-utils.js';

import ThreadMenu from './thread-menu.react.js';
import css from './thread-top-bar.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import Button from '../components/button.react.js';
import { InputStateContext } from '../input/input-state.js';
import PinnedMessagesModal from '../modals/chat/pinned-messages-modal.react.js';
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

  const bannerText =
    !!threadInfo.pinnedCount && pinnedMessageCountText(threadInfo.pinnedCount);

  const inputState = React.useContext(InputStateContext);
  const pushThreadPinsModal = React.useCallback(() => {
    pushModal(
      <InputStateContext.Provider value={inputState}>
        <PinnedMessagesModal threadInfo={threadInfo} modalName={bannerText} />
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
      {pinnedCountBanner}
    </>
  );
}

export default ThreadTopBar;

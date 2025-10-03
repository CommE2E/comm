// @flow

import * as React from 'react';
import { ChevronRight } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { pinnedMessageCountText } from 'lib/utils/message-pinning-utils.js';

import css from './pinned-messages-banner.css';
import { InputStateContext } from '../input/input-state.js';
import PinnedMessagesModal from '../modals/chat/pinned-messages-modal.react.js';

type Props = {
  +threadInfo: ThreadInfo,
};

function PinnedMessagesBanner(props: Props): React.Node {
  const { threadInfo } = props;

  const { pushModal } = useModalContext();

  const inputState = React.useContext(InputStateContext);

  const pushThreadPinsModal = React.useCallback(() => {
    pushModal(
      <InputStateContext.Provider value={inputState}>
        <PinnedMessagesModal threadInfo={threadInfo} />
      </InputStateContext.Provider>,
    );
  }, [pushModal, inputState, threadInfo]);

  const pinnedMessagesBanner = React.useMemo(() => {
    const isPinningDisabled =
      threadSpecs[threadInfo.type].protocol().temporarilyDisabledFeatures
        ?.pinningMessages;

    if (isPinningDisabled) {
      return null;
    }

    const bannerText =
      !!threadInfo.pinnedCount &&
      pinnedMessageCountText(threadInfo.pinnedCount);

    if (!bannerText) {
      return null;
    }

    return (
      <div className={css.container}>
        <a className={css.pinnedCountText} onClick={pushThreadPinsModal}>
          {bannerText}
          <ChevronRight size={14} className={css.chevronRight} />
        </a>
      </div>
    );
  }, [pushThreadPinsModal, threadInfo.pinnedCount, threadInfo.type]);

  return pinnedMessagesBanner;
}

export default PinnedMessagesBanner;

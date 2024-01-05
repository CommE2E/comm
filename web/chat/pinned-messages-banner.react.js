// @flow

import * as React from 'react';
import { ChevronRight } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
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

  const bannerText =
    !!threadInfo.pinnedCount && pinnedMessageCountText(threadInfo.pinnedCount);

  const pinnedMessagesBanner = React.useMemo(() => {
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
  }, [bannerText, pushThreadPinsModal]);

  return pinnedMessagesBanner;
}

export default PinnedMessagesBanner;

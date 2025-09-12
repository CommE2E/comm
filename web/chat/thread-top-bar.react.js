// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import { getProtocolByName } from 'lib/shared/threads/protocols/thread-protocols.js';
import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import PinnedMessagesBanner from './pinned-messages-banner.react.js';
import ThreadMenu from './thread-menu.react.js';
import css from './thread-top-bar.css';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import Button from '../components/button.react.js';
import ProtocolIcon from '../components/protocol-icon.react.js';
import { InputStateContext } from '../input/input-state.js';
import Modal from '../modals/modal.react.js';
import MessageSearchModal from '../modals/search/message-search-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type ThreadTopBarProps = {
  +threadInfo: ThreadInfo,
};
function ThreadTopBar(props: ThreadTopBarProps): React.Node {
  const { threadInfo } = props;
  const { pushModal, popModal } = useModalContext();

  const isThreadCreation = useSelector(
    state => state.navInfo.chatMode === 'create',
  );

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

  const { selectedProtocol } = useProtocolSelection();

  const protocolIcon = React.useMemo(() => {
    if (!isThreadCreation || !selectedProtocol) {
      return null;
    }

    const protocol = selectedProtocol
      ? getProtocolByName(selectedProtocol)
      : threadSpecs[threadInfo.type].protocol();

    if (!protocol) {
      return null;
    }

    const handleProtocolClick = () => {
      pushModal(
        <Modal name={protocol.protocolName} onClose={popModal} size="large">
          <div style={{ color: 'white' }}>
            {protocol.presentationDetails.description}
          </div>
        </Modal>,
      );
    };

    return (
      <Button onClick={handleProtocolClick} variant="plain">
        <ProtocolIcon protocol={protocol.protocolName} size={30} />
      </Button>
    );
  }, [
    isThreadCreation,
    threadInfo.type,
    selectedProtocol,
    pushModal,
    popModal,
  ]);

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
          {protocolIcon}
        </div>
      </div>
      <PinnedMessagesBanner threadInfo={threadInfo} />
    </>
  );
}

export default ThreadTopBar;

// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { getInlineEngagementSidebarText } from 'lib/shared/inline-engagement-utils.js';
import type { MessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './inline-engagement.css';
import ReactionPill from './reaction-pill.react.js';
import CommIcon from '../comm-icon.react.js';
import { useOnClickThread } from '../selectors/thread-selectors.js';

type Props = {
  +messageInfo: MessageInfo,
  +threadInfo: ThreadInfo,
  +sidebarThreadInfo: ?ThreadInfo,
  +reactions: ReactionInfo,
  +positioning: 'left' | 'center' | 'right',
  +label?: ?string,
  +deleted: boolean,
};
function InlineEngagement(props: Props): React.Node {
  const {
    messageInfo,
    threadInfo,
    sidebarThreadInfo,
    reactions,
    positioning,
    label,
    deleted,
  } = props;

  const { popModal } = useModalContext();

  const isLeft = positioning === 'left';

  const labelClasses = classNames({
    [css.messageLabel]: true,
    [css.messageLabelLeft]: isLeft,
    [css.messageLabelRight]: !isLeft,
  });
  const editedLabel = React.useMemo(() => {
    if (!label || deleted) {
      return null;
    }
    return (
      <div className={labelClasses}>
        <span>{label}</span>
      </div>
    );
  }, [deleted, label, labelClasses]);

  const onClickSidebarInner = useOnClickThread(sidebarThreadInfo);

  const onClickSidebar = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      popModal();
      onClickSidebarInner(event);
    },
    [popModal, onClickSidebarInner],
  );

  const repliesText = getInlineEngagementSidebarText(sidebarThreadInfo);

  const sidebarItem = React.useMemo(() => {
    if (!sidebarThreadInfo || !repliesText) {
      return null;
    }

    return (
      <a onClick={onClickSidebar} className={css.sidebarContainer}>
        <CommIcon size={14} icon="sidebar-filled" />
        {repliesText}
      </a>
    );
  }, [sidebarThreadInfo, repliesText, onClickSidebar]);

  const reactionsList = React.useMemo(() => {
    if (Object.keys(reactions).length === 0 || deleted) {
      return null;
    }

    return Object.keys(reactions).map(reaction => (
      <ReactionPill
        key={reaction}
        reaction={reaction}
        messageID={messageInfo.id}
        threadInfo={threadInfo}
        reactions={reactions}
      />
    ));
  }, [reactions, deleted, messageInfo.id, threadInfo]);

  const containerClasses = classNames([
    css.inlineEngagementContainer,
    {
      [css.leftContainer]: positioning === 'left',
      [css.centerContainer]: positioning === 'center',
      [css.rightContainer]: positioning === 'right',
    },
  ]);

  return (
    <div className={containerClasses}>
      {editedLabel}
      {sidebarItem}
      {reactionsList}
    </div>
  );
}

export default InlineEngagement;

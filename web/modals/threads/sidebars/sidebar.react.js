// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors.js';
import { useMessagePreview } from 'lib/shared/message-utils.js';
import { shortAbsoluteDate } from 'lib/utils/date-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './sidebars-modal.css';
import Button from '../../../components/button.react.js';
import ThreadAvatar from '../../../components/thread-avatar.react.js';
import { getDefaultTextMessageRules } from '../../../markdown/rules.react.js';
import { useOnClickThread } from '../../../selectors/thread-selectors.js';

type Props = {
  +sidebar: ChatThreadItem,
  +isLastItem?: boolean,
};

function Sidebar(props: Props): React.Node {
  const { sidebar, isLastItem } = props;
  const { threadInfo, lastUpdatedTime, mostRecentMessageInfo } = sidebar;
  const { unread } = threadInfo.currentUser;

  const { popModal } = useModalContext();

  const navigateToThread = useOnClickThread(threadInfo);

  const onClickThread = React.useCallback(
    event => {
      popModal();
      navigateToThread(event);
    },
    [popModal, navigateToThread],
  );

  const sidebarInfoClassName = classNames({
    [css.sidebarInfo]: true,
    [css.unread]: unread,
  });

  const previewTextClassName = classNames({
    [css.longTextEllipsis]: true,
    [css.avatarOffset]: true,
  });

  const lastActivity = React.useMemo(
    () => shortAbsoluteDate(lastUpdatedTime),
    [lastUpdatedTime],
  );

  const messagePreviewResult = useMessagePreview(
    mostRecentMessageInfo,
    threadInfo,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );

  const lastMessage = React.useMemo(() => {
    if (!messagePreviewResult) {
      return <div className={css.noMessage}>No messages</div>;
    }
    const { message, username } = messagePreviewResult;
    const previewText = username
      ? `${username.text}: ${message.text}`
      : message.text;
    return (
      <>
        <div className={previewTextClassName}>{previewText}</div>
        <div className={css.lastActivity}>{lastActivity}</div>
      </>
    );
  }, [lastActivity, messagePreviewResult, previewTextClassName]);

  const { uiName } = useResolvedThreadInfo(threadInfo);

  return (
    <Button className={css.sidebarContainer} onClick={onClickThread}>
      <img
        className={css.sidebarArrow}
        src={
          isLastItem
            ? 'images/arrow_sidebar_last.svg'
            : 'images/arrow_sidebar.svg'
        }
        alt="sidebar arrow"
      />
      <div className={sidebarInfoClassName}>
        <div className={css.avatarContainer}>
          <ThreadAvatar size="micro" threadInfo={threadInfo} />
          <div className={css.longTextEllipsis}>{uiName}</div>
        </div>
        <div className={css.lastMessage}>{lastMessage}</div>
      </div>
    </Button>
  );
}

export default Sidebar;

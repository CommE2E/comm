// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { type ChatThreadItem } from 'lib/selectors/chat-selectors.js';
import { useMessagePreview } from 'lib/shared/message-utils.js';
import { shortAbsoluteDate } from 'lib/utils/date-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './subchannels-modal.css';
import Button from '../../../components/button.react.js';
import ThreadAvatar from '../../../components/thread-avatar.react.js';
import { getDefaultTextMessageRules } from '../../../markdown/rules.react.js';
import { useOnClickThread } from '../../../selectors/thread-selectors.js';
import { shouldRenderAvatars } from '../../../utils/avatar-utils.js';

type Props = {
  +chatThreadItem: ChatThreadItem,
};

function Subchannel(props: Props): React.Node {
  const { chatThreadItem } = props;
  const {
    threadInfo,
    mostRecentMessageInfo,
    lastUpdatedTimeIncludingSidebars,
  } = chatThreadItem;

  const { unread } = threadInfo.currentUser;

  const subchannelTitleClassName = classNames({
    [css.subchannelInfo]: true,
    [css.unread]: unread,
  });

  const { popModal } = useModalContext();

  const navigateToThread = useOnClickThread(threadInfo);

  const onClickThread = React.useCallback(
    event => {
      popModal();
      navigateToThread(event);
    },
    [popModal, navigateToThread],
  );

  const lastActivity = React.useMemo(
    () => shortAbsoluteDate(lastUpdatedTimeIncludingSidebars),
    [lastUpdatedTimeIncludingSidebars],
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
        <div className={css.longTextEllipsis}>{previewText}</div>
        <div className={css.lastActivity}>{lastActivity}</div>
      </>
    );
  }, [lastActivity, messagePreviewResult]);

  const { uiName } = useResolvedThreadInfo(threadInfo);

  const avatar = React.useMemo(() => {
    if (!shouldRenderAvatars) {
      return <SWMansionIcon icon="message-square" size={22} />;
    }
    return <ThreadAvatar size="small" threadInfo={threadInfo} />;
  }, [threadInfo]);

  return (
    <Button className={css.subchannelContainer} onClick={onClickThread}>
      {avatar}
      <div className={subchannelTitleClassName}>
        <div className={css.longTextEllipsis}>{uiName}</div>
        <div className={css.lastMessage}>{lastMessage}</div>
      </div>
    </Button>
  );
}

export default Subchannel;

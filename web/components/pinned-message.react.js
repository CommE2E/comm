// @flow

import * as React from 'react';

import { useStringForUser } from 'lib/hooks/ens-cache.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import css from './pinned-message.css';
import { MessageListContext } from '../chat/message-list-types.js';
import Message from '../chat/message.react.js';
import { useTextMessageRulesFunc } from '../markdown/rules.react.js';

type PinnedMessageProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

function PinnedMessage(props: PinnedMessageProps): React.Node {
  const { item, threadInfo } = props;

  const getTextMessageMarkdownRules = useTextMessageRulesFunc(threadInfo);
  const messageListContext = React.useMemo(() => {
    if (!getTextMessageMarkdownRules) {
      return undefined;
    }
    return { getTextMessageMarkdownRules };
  }, [getTextMessageMarkdownRules]);

  const shouldShowUsername = !item.startsConversation && !item.startsCluster;
  const username = useStringForUser(
    shouldShowUsername ? item.messageInfo.creator : null,
  );

  return (
    <div className={css.messageContainer}>
      <div>
        <div className={css.creator}>{username}</div>
        <div className={css.messageContent}>
          <MessageListContext.Provider value={messageListContext}>
            <Message
              item={item}
              threadInfo={threadInfo}
              isRenderedInModal={true}
              key={item.messageInfo.id}
            />
          </MessageListContext.Provider>
        </div>
        <div className={css.messageDate}>
          {longAbsoluteDate(item.messageInfo.time)}
        </div>
      </div>
    </div>
  );
}

export default PinnedMessage;

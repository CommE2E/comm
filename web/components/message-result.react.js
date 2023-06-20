// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useStringForUser } from 'lib/hooks/ens-cache.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import css from './message-result.css';
import { MessageListContext } from '../chat/message-list-types.js';
import Message from '../chat/message.react.js';
import { useTextMessageRulesFunc } from '../markdown/rules.react.js';

type MessageResultProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +scrollable: boolean,
};

function MessageResult(props: MessageResultProps): React.Node {
  const { item, threadInfo, scrollable } = props;

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

  const messageContainerClassNames = classNames({
    [css.messageContainer]: true,
    [css.messageContainerOverflow]: scrollable,
  });

  return (
    <div className={messageContainerClassNames}>
      <div>
        <div className={css.creator}>{username}</div>
        <div className={css.messageContent}>
          <MessageListContext.Provider value={messageListContext}>
            <Message
              item={item}
              threadInfo={threadInfo}
              shouldDisplayPinIndicator={false}
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

export default MessageResult;

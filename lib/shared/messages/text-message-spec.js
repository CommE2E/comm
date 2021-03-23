// @flow

import invariant from 'invariant';
import * as SimpleMarkdown from 'simple-markdown';

import { messageTypes } from '../../types/message-types';
import type { MessageInfo } from '../../types/message-types';
import type {
  RawTextMessageInfo,
  TextMessageData,
  TextMessageInfo,
} from '../../types/messages/text';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { threadIsGroupChat } from '../thread-utils';
import { stringForUser } from '../user-utils';
import type {
  MessageSpec,
  NotificationTextsParams,
  RawMessageInfoFromRowParams,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

/**
 * most of the markdown leaves contain `content` field (it is an array or a string)
 * apart from lists, which have `items` field (that holds an array)
 */
const rawTextFromMarkdownAST = (node: SimpleMarkdown.ASTNode): string => {
  if (node.content && typeof node.content === 'string') {
    return node.content;
  } else if (node.items) {
    return rawTextFromMarkdownAST(node.items);
  } else if (node.content) {
    return rawTextFromMarkdownAST(node.content);
  } else if (Array.isArray(node)) {
    return node.map(rawTextFromMarkdownAST).join('');
  }
  return '';
};

const getFirstNonQuotedRawLine = (
  nodes: $ReadOnlyArray<SimpleMarkdown.SingleASTNode>,
): string => {
  let result = 'message';
  for (const node of nodes) {
    if (node.type === 'blockQuote') {
      result = 'quoted message';
    } else {
      const rawText = rawTextFromMarkdownAST(node);
      if (!rawText || !rawText.replace(/\s/g, '')) {
        // handles the case of an empty(or containing only white spaces)
        // new line that usually occurs between a quote and the rest
        // of the message(we don't want it as a title, thus continue)
        continue;
      }
      return rawText;
    }
  }
  return result;
};

export const textMessageSpec: MessageSpec<
  TextMessageData,
  RawTextMessageInfo,
  TextMessageInfo,
> = Object.freeze({
  messageContent(data: TextMessageData): string {
    return data.text;
  },

  messageTitle({ messageInfo, markdownRules }) {
    const { text } = messageInfo;
    const parser = SimpleMarkdown.parserFor(markdownRules);
    const ast = parser(text, { disableAutoBlockNewlines: true });

    return getFirstNonQuotedRawLine(ast).trim();
  },

  rawMessageInfoFromRow(
    row: Object,
    params: RawMessageInfoFromRowParams,
  ): RawTextMessageInfo {
    const rawTextMessageInfo: RawTextMessageInfo = {
      type: messageTypes.TEXT,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      text: row.content,
    };
    if (params.localID) {
      rawTextMessageInfo.localID = params.localID;
    }
    return rawTextMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawTextMessageInfo,
    creator: RelativeUserInfo,
  ): TextMessageInfo {
    const messageInfo: TextMessageInfo = {
      type: messageTypes.TEXT,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      text: rawMessageInfo.text,
    };
    if (rawMessageInfo.id) {
      messageInfo.id = rawMessageInfo.id;
    }
    if (rawMessageInfo.localID) {
      messageInfo.localID = rawMessageInfo.localID;
    }
    return messageInfo;
  },

  rawMessageInfoFromMessageData(
    messageData: TextMessageData,
    id: ?string,
  ): RawTextMessageInfo {
    if (id) {
      return { ...messageData, id };
    } else {
      return { ...messageData };
    }
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.TEXT,
      'messageInfo should be messageTypes.TEXT!',
    );
    if (!threadInfo.name && !threadIsGroupChat(threadInfo)) {
      return {
        merged: `${threadInfo.uiName}: ${messageInfo.text}`,
        body: messageInfo.text,
        title: threadInfo.uiName,
      };
    } else {
      const userString = stringForUser(messageInfo.creator);
      const threadName = params.notifThreadName(threadInfo);
      return {
        merged: `${userString} to ${threadName}: ${messageInfo.text}`,
        body: messageInfo.text,
        title: threadInfo.uiName,
        prefix: `${userString}:`,
      };
    }
  },

  generatesNotifs: true,
  includedInRepliesCount: true,
});

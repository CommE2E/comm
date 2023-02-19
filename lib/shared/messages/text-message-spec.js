// @flow

import invariant from 'invariant';
import * as SimpleMarkdown from 'simple-markdown';

import {
  pushTypes,
  type MessageSpec,
  type RawMessageInfoFromServerDBRowParams,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  RawTextMessageInfo,
  TextMessageData,
  TextMessageInfo,
} from '../../types/messages/text.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET } from '../../utils/entity-text.js';
import {
  type ASTNode,
  type SingleASTNode,
  stripSpoilersFromNotifications,
  stripSpoilersFromMarkdownAST,
} from '../markdown.js';
import { threadIsGroupChat } from '../thread-utils.js';

/**
 * most of the markdown leaves contain `content` field
 * (it is an array or a string) apart from lists,
 * which have `items` field (that holds an array)
 */
const rawTextFromMarkdownAST = (node: ASTNode): string => {
  if (Array.isArray(node)) {
    return node.map(rawTextFromMarkdownAST).join('');
  }
  const { content, items } = node;
  if (content && typeof content === 'string') {
    return content;
  } else if (items) {
    return rawTextFromMarkdownAST(items);
  } else if (content) {
    return rawTextFromMarkdownAST(content);
  }
  return '';
};

const getFirstNonQuotedRawLine = (
  nodes: $ReadOnlyArray<SingleASTNode>,
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
  messageContentForServerDB(
    data: TextMessageData | RawTextMessageInfo,
  ): string {
    return data.text;
  },

  messageContentForClientDB(data: RawTextMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  messageTitle({ messageInfo, markdownRules }) {
    const { text } = messageInfo;
    const parser = SimpleMarkdown.parserFor(markdownRules);
    const ast = stripSpoilersFromMarkdownAST(
      parser(text, { disableAutoBlockNewlines: true }),
    );
    return ET`${getFirstNonQuotedRawLine(ast).trim()}`;
  },

  rawMessageInfoFromServerDBRow(
    row: Object,
    params: RawMessageInfoFromServerDBRowParams,
  ): RawTextMessageInfo {
    let rawTextMessageInfo: RawTextMessageInfo = {
      type: messageTypes.TEXT,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      text: row.content,
    };
    if (params.localID) {
      rawTextMessageInfo = { ...rawTextMessageInfo, localID: params.localID };
    }
    return rawTextMessageInfo;
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawTextMessageInfo {
    let rawTextMessageInfo: RawTextMessageInfo = {
      type: messageTypes.TEXT,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      text: clientDBMessageInfo.content ?? '',
    };
    if (clientDBMessageInfo.local_id) {
      rawTextMessageInfo = {
        ...rawTextMessageInfo,
        localID: clientDBMessageInfo.local_id,
      };
    }
    if (clientDBMessageInfo.id !== clientDBMessageInfo.local_id) {
      rawTextMessageInfo = {
        ...rawTextMessageInfo,
        id: clientDBMessageInfo.id,
      };
    }
    return rawTextMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawTextMessageInfo,
    creator: RelativeUserInfo,
  ): TextMessageInfo {
    let messageInfo: TextMessageInfo = {
      type: messageTypes.TEXT,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      text: rawMessageInfo.text,
    };
    if (rawMessageInfo.id) {
      messageInfo = { ...messageInfo, id: rawMessageInfo.id };
    }
    if (rawMessageInfo.localID) {
      messageInfo = { ...messageInfo, localID: rawMessageInfo.localID };
    }
    return messageInfo;
  },

  rawMessageInfoFromMessageData(
    messageData: TextMessageData,
    id: ?string,
  ): RawTextMessageInfo {
    const { sidebarCreation, ...rest } = messageData;
    if (id) {
      return { ...rest, id };
    } else {
      return { ...rest };
    }
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.TEXT,
      'messageInfo should be messageTypes.TEXT!',
    );
    const notificationTextWithoutSpoilers = stripSpoilersFromNotifications(
      messageInfo.text,
    );
    if (!threadInfo.name && !threadIsGroupChat(threadInfo)) {
      const thread = ET.thread({ display: 'uiName', threadInfo });
      return {
        merged: ET`${thread}: ${notificationTextWithoutSpoilers}`,
        body: notificationTextWithoutSpoilers,
        title: threadInfo.uiName,
      };
    } else {
      const creator = ET.user({ userInfo: messageInfo.creator });
      const thread = ET.thread({ display: 'shortName', threadInfo });
      return {
        merged: ET`${creator} to ${thread}: ${notificationTextWithoutSpoilers}`,
        body: notificationTextWithoutSpoilers,
        title: threadInfo.uiName,
        prefix: ET`${creator}:`,
      };
    }
  },

  generatesNotifs: async (
    rawMessageInfo: RawTextMessageInfo,
    messageData: TextMessageData,
  ) => (messageData.sidebarCreation ? undefined : pushTypes.NOTIF),

  includedInRepliesCount: true,
});

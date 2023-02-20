// @flow

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';

import type { ASTNode, SingleASTNode } from 'lib/shared/markdown.js';
import { messageKey } from 'lib/shared/message-utils.js';
import type { TextMessageInfo } from 'lib/types/messages/text.js';

import { useTextMessageMarkdownRules } from '../chat/message-list-types.js';

export type TextMessageMarkdownContextType = {
  +messageKey: string,
  +markdownAST: $ReadOnlyArray<SingleASTNode>,
  +markdownHasPressable: boolean,
};

const TextMessageMarkdownContext: React.Context<?TextMessageMarkdownContextType> =
  React.createContext<?TextMessageMarkdownContextType>(null);
const pressableMarkdownTypes = new Set(['link', 'spoiler']);
const markdownASTHasPressable = (node: ASTNode): boolean => {
  if (Array.isArray(node)) {
    return node.some(markdownASTHasPressable);
  }
  const { type, content, items } = node;
  if (pressableMarkdownTypes.has(type)) {
    return true;
  } else if (items) {
    return markdownASTHasPressable(items);
  } else if (content) {
    return markdownASTHasPressable(content);
  }
  return false;
};

function useTextMessageMarkdown(
  messageInfo: TextMessageInfo,
): TextMessageMarkdownContextType {
  // useDarkStyle doesn't affect the AST (only the styles),
  // so we can safely just set it to false here
  const rules = useTextMessageMarkdownRules(false);
  const { simpleMarkdownRules, container } = rules;

  const { text } = messageInfo;
  const ast = React.useMemo(() => {
    const parser = SimpleMarkdown.parserFor(simpleMarkdownRules);
    return parser(text, { disableAutoBlockNewlines: true, container });
  }, [simpleMarkdownRules, text, container]);

  const key = messageKey(messageInfo);
  return React.useMemo(
    () => ({
      messageKey: key,
      markdownAST: ast,
      markdownHasPressable: markdownASTHasPressable(ast),
    }),
    [key, ast],
  );
}

export { TextMessageMarkdownContext, useTextMessageMarkdown };

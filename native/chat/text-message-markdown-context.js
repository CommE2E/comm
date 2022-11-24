// @flow

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';

import type { SingleASTNode } from 'lib/shared/markdown';
import { messageKey } from 'lib/shared/message-utils';
import type { TextMessageInfo } from 'lib/types/messages/text';

import { useTextMessageMarkdownRules } from '../chat/message-list-types';

export type TextMessageMarkdownContextType = {
  +messageKey: string,
  +markdownAST: $ReadOnlyArray<SingleASTNode>,
};

const TextMessageMarkdownContext: React.Context<?TextMessageMarkdownContextType> = React.createContext<?TextMessageMarkdownContextType>(
  null,
);

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
    }),
    [key, ast],
  );
}

export { TextMessageMarkdownContext, useTextMessageMarkdown };

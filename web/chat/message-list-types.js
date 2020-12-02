// @flow

import * as React from 'react';

import type { MarkdownRules } from '../markdown/rules.react';

export type MessageListContextType = {|
  +getTextMessageMarkdownRules: (useDarkStyle: boolean) => MarkdownRules,
|};

export const MessageListContext = React.createContext<?MessageListContextType>();

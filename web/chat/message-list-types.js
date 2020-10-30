// @flow

import type { MarkdownRules } from '../markdown/rules.react';

import * as React from 'react';

export type MessageListContextType = {|
  +getTextMessageMarkdownRules: (useDarkStyle: boolean) => MarkdownRules,
|};

export const MessageListContext = React.createContext<?MessageListContextType>();

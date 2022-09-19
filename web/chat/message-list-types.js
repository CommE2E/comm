// @flow

import * as React from 'react';

import type { MarkdownRules } from '../markdown/rules.react';

export type MessageListContextType = {
  +getTextMessageMarkdownRules: (
    useDarkStyle: boolean,
    isViewer: boolean,
  ) => MarkdownRules,
};

export const MessageListContext: React.Context<?MessageListContextType> = React.createContext<?MessageListContextType>();

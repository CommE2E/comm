// @flow

import * as React from 'react';

export type MarkdownLinkContextType = {
  +setLinkPressActive: boolean => void,
};

const MarkdownLinkContext: React.Context<?MarkdownLinkContextType> = React.createContext<?MarkdownLinkContextType>(
  null,
);

export { MarkdownLinkContext };

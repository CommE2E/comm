// @flow

import * as React from 'react';

export type MarkdownContextType = {
  +setLinkModalActive: boolean => void,
  +setLinkPressActive: boolean => void,
};

const MarkdownContext: React.Context<?MarkdownContextType> = React.createContext<?MarkdownContextType>(
  null,
);

export { MarkdownContext };

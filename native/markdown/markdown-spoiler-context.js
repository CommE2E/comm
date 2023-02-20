// @flow

import * as React from 'react';

export type MarkdownSpoilerContextType = {
  +isRevealed: boolean,
};

const MarkdownSpoilerContext: React.Context<?MarkdownSpoilerContextType> =
  React.createContext<?MarkdownSpoilerContextType>(null);

export { MarkdownSpoilerContext };

// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';

export type MarkdownContextType = {
  +setLinkModalActive: SetState<{ [key: string]: boolean }>,
  +linkModalActive: { [key: string]: boolean },
  +setSpoilerRevealed: SetState<{ [key: string]: { [key: number]: boolean } }>,
  +spoilerRevealed: { [key: string]: { [key: number]: boolean } },
  +clearMarkdownContextData: () => void,
};

const MarkdownContext: React.Context<?MarkdownContextType> =
  React.createContext<?MarkdownContextType>(null);

export { MarkdownContext };

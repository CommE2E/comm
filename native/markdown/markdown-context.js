// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types';

export type MarkdownContextType = {
  +setLinkModalActive: SetState<{ [key: string]: boolean }>,
  +linkModalActive: { [key: string]: boolean },
  +setLinkPressActive: SetState<{ [key: string]: boolean }>,
  +linkPressActive: { [key: string]: boolean },

  +setSpoilerRevealed: SetState<{ [key: string]: { [key: number]: boolean } }>,
  +spoilerRevealed: { [key: string]: { [key: number]: boolean } },
  +setSpoilerPressActive: SetState<boolean>,
  +spoilerPressActive: boolean,

  +clearMarkdownContextData: () => void,
};

const MarkdownContext: React.Context<?MarkdownContextType> = React.createContext<?MarkdownContextType>(
  null,
);

export { MarkdownContext };

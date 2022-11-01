// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types';

export type MarkdownContextType = {
  +setLinkModalActive: SetState<{ [key: string]: boolean }>,
  +linkModalActive: { [key: string]: boolean },
  +setLinkPressActive: SetState<{ [key: string]: boolean }>,
  +linkPressActive: { [key: string]: boolean },
  +clearMarkdownContextData: () => void,
};

const MarkdownContext: React.Context<?MarkdownContextType> = React.createContext<?MarkdownContextType>(
  null,
);

export { MarkdownContext };

// @flow

import * as React from 'react';

export type MarkdownLinkContextType = {|
  +setLinkPressActive: boolean => void,
|};

const MarkdownLinkContext = React.createContext<?MarkdownLinkContextType>(null);

export { MarkdownLinkContext };

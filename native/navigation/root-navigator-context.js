// @flow

import * as React from 'react';

export type RootNavigatorContextType = {
  setKeyboardHandlingEnabled: (enabled: boolean) => void,
};

const RootNavigatorContext: React.Context<?RootNavigatorContextType> =
  React.createContext<?RootNavigatorContextType>(null);

export { RootNavigatorContext };

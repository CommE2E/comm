// @flow

import * as React from 'react';

export type RootContextType = {|
  +detectUnsupervisedBackground?: ?(alreadyClosed: boolean) => boolean,
  +setNavStateInitialized: () => void,
|};

const RootContext = React.createContext<?RootContextType>(null);

export { RootContext };

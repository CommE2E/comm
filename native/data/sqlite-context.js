// @flow

import * as React from 'react';

export type SQLiteContextType = {
  +threadStoreLoaded: boolean,
};

const SQLiteContext: React.Context<?SQLiteContextType> = React.createContext(
  null,
);

export { SQLiteContext };

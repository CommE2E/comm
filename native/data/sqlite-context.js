// @flow

import * as React from 'react';

export type SQLiteContextType = {
  +storeLoaded: boolean,
};

const SQLiteContext: React.Context<?SQLiteContextType> = React.createContext(
  null,
);

export { SQLiteContext };

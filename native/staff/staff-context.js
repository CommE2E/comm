// @flow

import * as React from 'react';

export type StaffContextType = {
  +staffUserHasBeenLoggedIn: boolean,
};

const StaffContext: React.Context<StaffContextType> = React.createContext({
  staffUserHasBeenLoggedIn: false,
});

export { StaffContext };

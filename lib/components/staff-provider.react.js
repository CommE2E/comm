// @flow

import * as React from 'react';

import { useIsCurrentUserStaff } from '../shared/staff-utils.js';

export type StaffContextType = {
  +staffUserHasBeenLoggedIn: boolean,
};

const StaffContext: React.Context<StaffContextType> =
  React.createContext<StaffContextType>({
    staffUserHasBeenLoggedIn: false,
  });

type Props = {
  +children: React.Node,
};
function StaffContextProvider(props: Props): React.Node {
  const [staffUserHasBeenLoggedIn, setStaffUserHasBeenLoggedIn] =
    React.useState(false);

  const isCurrentUserStaff = useIsCurrentUserStaff();

  React.useEffect(() => {
    if (isCurrentUserStaff) {
      setStaffUserHasBeenLoggedIn(true);
    }
  }, [isCurrentUserStaff]);

  const staffContextValue: StaffContextType = React.useMemo(
    () => ({ staffUserHasBeenLoggedIn }),
    [staffUserHasBeenLoggedIn],
  );

  return (
    <StaffContext.Provider value={staffContextValue}>
      {props.children}
    </StaffContext.Provider>
  );
}

const useStaffContext = (): StaffContextType => React.useContext(StaffContext);

export { StaffContextProvider, useStaffContext };

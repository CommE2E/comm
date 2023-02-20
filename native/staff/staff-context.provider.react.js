// @flow

import * as React from 'react';

import { StaffContext, type StaffContextType } from './staff-context.js';
import { useIsCurrentUserStaff } from '../utils/staff-utils.js';

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

export { StaffContextProvider };

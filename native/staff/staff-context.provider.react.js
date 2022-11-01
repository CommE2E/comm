// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { isStaff } from 'lib/shared/user-utils';

import { StaffContext, type StaffContextType } from './staff-context';

type Props = {
  +children: React.Node,
};
function StaffContextProvider(props: Props): React.Node {
  const [
    staffUserHasBeenLoggedIn,
    setStaffUserHasBeenLoggedIn,
  ] = React.useState(false);

  const isCurrentUserStaff = useSelector(
    state =>
      state.currentUserInfo &&
      state.currentUserInfo.id &&
      isStaff(state.currentUserInfo.id),
  );

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

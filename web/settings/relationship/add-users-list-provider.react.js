// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';

import type { BaseAddUserInfo } from './add-users-list-item.react.js';

export type AddUsersListContextType = {
  +pendingUsersToAdd: $ReadOnlyMap<string, BaseAddUserInfo>,
  +setPendingUsersToAdd: SetState<$ReadOnlyMap<string, BaseAddUserInfo>>,
  +previouslySelectedUsers: $ReadOnlyMap<string, BaseAddUserInfo>,
  +setPreviouslySelectedUsers: SetState<$ReadOnlyMap<string, BaseAddUserInfo>>,
  +errorMessage: string,
  +setErrorMessage: SetState<string>,
};

const AddUsersListContext = React.createContext<?AddUsersListContextType>();

type Props = {
  +children: React.Node,
};

function AddUsersListProvider(props: Props): React.Node {
  const { children } = props;

  const [pendingUsersToAdd, setPendingUsersToAdd] = React.useState<
    $ReadOnlyMap<string, BaseAddUserInfo>,
  >(new Map());
  const [previouslySelectedUsers, setPreviouslySelectedUsers] = React.useState<
    $ReadOnlyMap<string, BaseAddUserInfo>,
  >(new Map());
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const contextValue = React.useMemo(
    () => ({
      pendingUsersToAdd,
      setPendingUsersToAdd,
      previouslySelectedUsers,
      setPreviouslySelectedUsers,
      errorMessage,
      setErrorMessage,
    }),
    [pendingUsersToAdd, previouslySelectedUsers, errorMessage],
  );

  return (
    <AddUsersListContext.Provider value={contextValue}>
      {children}
    </AddUsersListContext.Provider>
  );
}

function useAddUsersListContext(): AddUsersListContextType {
  const addUsersListContext = React.useContext(AddUsersListContext);

  invariant(addUsersListContext, 'addUsersListContext should be set');
  return addUsersListContext;
}

export { AddUsersListProvider, useAddUsersListContext };

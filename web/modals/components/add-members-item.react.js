// @flow

import * as React from 'react';

import type { UserListItem } from 'lib/types/user-types.js';

import css from './add-members.css';
import Button from '../../components/button.react.js';

type AddMembersItemProps = {
  +userInfo: UserListItem,
  +onClick: (userID: string) => void,
  +userAdded: boolean,
};

function AddMemberItem(props: AddMembersItemProps): React.Node {
  const { userInfo, onClick, userAdded = false } = props;

  const canBeAdded = !userInfo.alert;

  const onClickCallback = React.useCallback(() => {
    if (!canBeAdded) {
      return;
    }
    onClick(userInfo.id);
  }, [canBeAdded, onClick, userInfo.id]);

  const action = React.useMemo(() => {
    if (!canBeAdded) {
      return userInfo.alert?.title;
    }
    if (userAdded) {
      return <span className={css.danger}>Remove</span>;
    } else {
      return 'Add';
    }
  }, [canBeAdded, userAdded, userInfo.alert]);

  return (
    <Button
      className={css.addMemberItem}
      onClick={onClickCallback}
      disabled={!canBeAdded}
    >
      <div className={css.label}>{userInfo.username}</div>
      <div className={css.label}>{action}</div>
    </Button>
  );
}

export default AddMemberItem;

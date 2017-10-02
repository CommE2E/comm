// @flow

import type { UserInfo } from 'lib/types/user-types';
import { userInfoPropType } from 'lib/types/user-types';

import React from 'react';
import PropTypes from 'prop-types';
import { FlatList } from 'react-native';

import UserListUser from './user-list-user.react';

class UserList extends React.PureComponent {

  props: {
    userInfos: $ReadOnlyArray<UserInfo>,
    onSelect: (userID: string) => void,
  };
  static propTypes = {
    userInfos: PropTypes.arrayOf(userInfoPropType).isRequired,
    onSelect: PropTypes.func.isRequired,
  };

  render() {
    return (
      <FlatList
        data={this.props.userInfos}
        renderItem={this.renderItem}
        keyExtractor={UserList.keyExtractor}
        getItemLayout={UserList.getItemLayout}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  static keyExtractor(threadInfo: UserInfo) {
    return threadInfo.id;
  }

  renderItem = (row: { item: UserInfo }) => {
    return (
      <UserListUser
        userInfo={row.item}
        onSelect={this.props.onSelect}
      />
    );
  }

  static getItemLayout(data: $ReadOnlyArray<UserInfo>, index: number) {
    return { length: 24, offset: 24 * index, index };
  }

}

export default UserList;

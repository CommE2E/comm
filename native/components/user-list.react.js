// @flow

import type {
  ____TextStyleProp_Internal as TextStyle,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';
import { type UserListItem, userListItemPropType } from 'lib/types/user-types';

import React from 'react';
import PropTypes from 'prop-types';
import { FlatList, Text } from 'react-native';
import _sum from 'lodash/fp/sum';

import { UserListUser, getUserListItemHeight } from './user-list-user.react';

type Props = {
  userInfos: $ReadOnlyArray<UserListItem>,
  onSelect: (userID: string) => void,
  itemTextStyle?: TextStyle,
};
class UserList extends React.PureComponent<Props> {

  static propTypes = {
    userInfos: PropTypes.arrayOf(userListItemPropType).isRequired,
    onSelect: PropTypes.func.isRequired,
    itemTextStyle: Text.propTypes.style,
  };

  render() {
    return (
      <FlatList
        data={this.props.userInfos}
        renderItem={this.renderItem}
        keyExtractor={UserList.keyExtractor}
        getItemLayout={UserList.getItemLayout}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
      />
    );
  }

  static keyExtractor(userInfo: UserListItem) {
    return userInfo.id;
  }

  renderItem = (row: { item: UserListItem }) => {
    return (
      <UserListUser
        userInfo={row.item}
        onSelect={this.props.onSelect}
        textStyle={this.props.itemTextStyle}
      />
    );
  }

  static getItemLayout(data: ?$ReadOnlyArray<UserListItem>, index: number) {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = _sum(data.filter((_, i) => i < index).map(getUserListItemHeight));
    const item = data[index];
    const length = item ? getUserListItemHeight(item) : 0;
    return { length, offset, index };
  }

}

export default UserList;

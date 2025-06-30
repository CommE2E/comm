// @flow

import _sum from 'lodash/fp/sum.js';
import * as React from 'react';
import { FlatList } from 'react-native';

import type { UserListItem, AccountUserInfo } from 'lib/types/user-types.js';

import { UserListUser, getUserListItemHeight } from './user-list-user.react.js';
import { type IndicatorStyle, useIndicatorStyle } from '../themes/colors.js';
import type { TextStyle } from '../types/styles.js';

type BaseProps = {
  +userInfos: $ReadOnlyArray<UserListItem>,
  +onSelect: (user: AccountUserInfo) => mixed,
  +itemTextStyle?: TextStyle,
};
type Props = {
  ...BaseProps,
  // Redux state
  +indicatorStyle: IndicatorStyle,
};
class UserList extends React.PureComponent<Props> {
  render(): React.Node {
    return (
      <FlatList
        data={this.props.userInfos}
        renderItem={this.renderItem}
        keyExtractor={UserList.keyExtractor}
        getItemLayout={UserList.getItemLayout}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        extraData={this.props.itemTextStyle}
        indicatorStyle={this.props.indicatorStyle}
      />
    );
  }

  static keyExtractor = (userInfo: UserListItem): string => {
    return userInfo.id;
  };

  renderItem = (row: { +item: UserListItem, ... }): React.Node => {
    return (
      <UserListUser
        userInfo={row.item}
        onSelect={this.props.onSelect}
        textStyle={this.props.itemTextStyle}
      />
    );
  };

  static getItemLayout = (
    data: ?$ArrayLike<UserListItem>,
    index: number,
  ): { length: number, offset: number, index: number } => {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = _sum(
      Array.from(data)
        .filter((_, i) => i < index)
        .map(getUserListItemHeight),
    );
    const item = data[index];
    const length = item ? getUserListItemHeight(item) : 0;
    return { length, offset, index };
  };
}

const ConnectedUserList: React.ComponentType<BaseProps> = React.memo<
  BaseProps,
  void,
>(function ConnectedUserList(props: BaseProps) {
  const indicatorStyle = useIndicatorStyle();
  return <UserList {...props} indicatorStyle={indicatorStyle} />;
});

export default ConnectedUserList;

// @flow

import type { NavigationRoute } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';
import type { MoreNavigationProp } from './more.react';

import * as React from 'react';
import { View, Text, FlatList } from 'react-native';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';
import { type UserInfo } from 'lib/types/user-types';

import { AddFriendsModalRouteName } from '../navigation/route-names';
import { styleSelector } from '../themes/colors';

import RelationshipListItem from './relationship-list-item.react';

const DATA: UserInfo[] = [
  { id: '1', username: 'John' },
  { id: '2', username: 'Emma' },
];

const mapListData = (users: UserInfo[]): ListItem[] => {
  const isEmpty = !users.length;

  const mapUser = (userInfo, index) => ({
    type: 'user',
    userInfo,
    lastListItem: users.length - 1 === index,
  });

  return []
    .concat(isEmpty ? { type: 'empty' } : [])
    .concat(isEmpty ? [] : { type: 'header' })
    .concat(users.map(mapUser))
    .concat(isEmpty ? [] : { type: 'header' });
};

const LIST_DATA = mapListData(DATA);

type ListItem =
  | {| type: 'empty' |}
  | {| type: 'header' |}
  | {| type: 'footer' |}
  | {| type: 'user', userInfo: UserInfo, lastListItem: boolean |};

type Props = {|
  navigation: MoreNavigationProp<>,
  route: NavigationRoute<'FriendList' | 'BlockList'>,
  // Redux state
  styles: typeof styles,
|};
class RelationshipList extends React.PureComponent<Props> {
  render() {
    return (
      <View style={this.props.styles.container}>
        <FlatList
          contentContainerStyle={this.props.styles.contentContainer}
          data={LIST_DATA}
          renderItem={this.renderItem}
        />
      </View>
    );
  }

  renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'empty') {
      return (
        <Text
          style={this.props.styles.emptyText}
        >{`You haven't added any users yet`}</Text>
      );
    }
    if (item.type === 'header' || item.type === 'footer') {
      return <View style={this.props.styles.separator} />;
    }
    if (item.type === 'user') {
      return (
        <RelationshipListItem
          userInfo={item.userInfo}
          lastListItem={item.lastListItem}
        />
      );
    }
    invariant(false, `unexpected RelationshipList item type ${item.type}`);
  };

  onPressAddFriends = () => {
    this.props.navigation.navigate({
      name: AddFriendsModalRouteName,
    });
  };
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
  contentContainer: {
    marginTop: 24,
  },
  separator: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
  },
  emptyText: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
  },
};

const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(RelationshipList);

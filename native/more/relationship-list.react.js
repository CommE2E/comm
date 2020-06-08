// @flow

import type { NavigationRoute } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';
import type { MoreNavigationProp } from './more.react';

import * as React from 'react';
import { View, Text, FlatList } from 'react-native';

import { connect } from 'lib/utils/redux-utils';
import { type UserInfo } from 'lib/types/user-types';

import { AddFriendsModalRouteName } from '../navigation/route-names';
import { styleSelector } from '../themes/colors';

import RelationshipListItem from './relationship-list-item.react';

type Props = {|
  navigation: MoreNavigationProp<>,
  route: NavigationRoute<'FriendList' | 'BlockList'>,
  // Redux state
  styles: typeof styles,
|};

const DATA = [
  { id: '1', username: 'John' },
  { id: '2', username: 'Emma' },
];

class RelationshipList extends React.PureComponent<Props> {
  render() {
    return (
      <View style={this.props.styles.container}>
        <FlatList
          contentContainerStyle={this.props.styles.contentContainer}
          ListEmptyComponent={
            <View style={this.props.styles.empty}>
              <Text
                style={this.props.styles.emptyText}
              >{`You haven't added any users yet`}</Text>
            </View>
          }
          ListHeaderComponent={<View style={this.props.styles.separator} />}
          ListFooterComponent={<View style={this.props.styles.separator} />}
          ItemSeparatorComponent={() => (
            <View style={[this.props.styles.separator, styles.indentation]} />
          )}
          data={DATA}
          renderItem={this.renderItem}
        />
      </View>
    );
  }

  renderItem = ({ item }: { item: UserInfo }) => {
    return <RelationshipListItem userInfo={item} />;
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
    backgroundColor: 'panelForeground',
  },
  separator: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
  },
  indentation: {
    marginHorizontal: 12,
  },
  empty: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
  },
  emptyText: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
};

const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(RelationshipList);

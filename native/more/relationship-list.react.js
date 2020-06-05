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
import RelationshipListAddButton from './relationship-list-add-button.react';

type Props = {|
  navigation: MoreNavigationProp<'FriendList'>,
  route: NavigationRoute<'FriendList'>,
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
          ListHeaderComponent={
            <View style={this.props.styles.header}>
              <Text style={this.props.styles.headerText}>FRIENDS</Text>
              <View style={this.props.styles.buttonWrapper}>
                <View
                  style={[
                    this.props.styles.buttonInner,
                    DATA.length !== 0 && styles.buttonInnerBorder,
                  ]}
                >
                  <RelationshipListAddButton
                    text="Add"
                    onPress={this.onPressAddFriends}
                  />
                </View>
              </View>
            </View>
          }
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
  header: {
    backgroundColor: 'panelBackground',
    borderColor: 'panelForegroundBorder',
  },
  headerText: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  separator: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
  },
  indentation: {
    marginHorizontal: 12,
  },
  buttonWrapper: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    backgroundColor: 'panelForeground',
  },
  buttonInner: {
    marginHorizontal: 12,
    borderColor: 'panelForegroundBorder',
  },
  buttonInnerBorder: {
    borderBottomWidth: 1,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(RelationshipList);

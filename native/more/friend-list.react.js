// @flow

import type { NavigationRoute } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';
import type { MoreNavigationProp } from './more.react';

import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';

import { connect } from 'lib/utils/redux-utils';
import { type UserInfo } from 'lib/types/user-types';

import { AddFriendsModalRouteName } from '../navigation/route-names';
import { styleSelector } from '../themes/colors';

import FriendListItem from './friend-list-item.react';

type Props = {|
  navigation: MoreNavigationProp<'FriendList'>,
  route: NavigationRoute<'FriendList'>,
  // Redux state
  styles: typeof styles,
|};

type State = {||};

class FriendList extends React.PureComponent<Props, State> {
  render() {
    return (
      <View style={this.props.styles.container}>
        <TouchableOpacity
          onPress={() => {
            this.props.navigation.navigate({
              name: AddFriendsModalRouteName,
            });
          }}
        >
          <Text>add</Text>
        </TouchableOpacity>
        <FlatList
          data={[
            { id: '1', username: 'example' },
            { id: '2', username: 'example2' },
          ]}
          renderItem={this.renderItem}
        />
      </View>
    );
  }

  renderItem = ({ item }: { item: UserInfo }) => {
    return <FriendListItem userInfo={item} />;
  };
}

const styles = {
  container: {
    flex: 1,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(FriendList);

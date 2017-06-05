// @flow

import type { AppState } from '../redux-setup';
import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { MessageInfo } from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import _sum from 'lodash/fp/sum';

import { messageListData } from '../selectors/chat-selectors';
import { messageKey } from 'lib/shared/message-utils';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>;

class InnerMessageList extends React.PureComponent {

  props: {
    navigation: NavProp,
    // Redux state
    messageListData: $ReadOnlyArray<MessageInfo>,
  };
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType,
        }).isRequired,
      }).isRequired,
    }).isRequired,
    messageListData: PropTypes.arrayOf(messageInfoPropType).isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.name,
  });

  renderItem = (row: { item: MessageInfo }) => {
    return <Text numberOfLines={1}>{row.item.text}</Text>;
  }

  static getItemLayout(data: $ReadOnlyArray<MessageInfo>, index: number) {
    const offset =
      InnerMessageList.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? InnerMessageList.itemHeight(item) : 0;
    return { length, offset, index };
  }

  static itemHeight(item: MessageInfo): number {
    return 40;
  }

  static heightOfItems(data: $ReadOnlyArray<MessageInfo>): number {
    return _sum(data.map(InnerMessageList.itemHeight));
  }

  render() {
    return (
      <View style={styles.container}>
        <FlatList
          data={this.props.messageListData}
          renderItem={this.renderItem}
          keyExtractor={messageKey}
          getItemLayout={InnerMessageList.getItemLayout}
          style={styles.flatList}
        />
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});


const MessageListRouteName = 'MessageList';
const MessageList = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => ({
    messageListData: messageListData
      (ownProps.navigation.state.params.threadInfo.id)(state),
  }),
)(InnerMessageList);

export {
  MessageList,
  MessageListRouteName,
};

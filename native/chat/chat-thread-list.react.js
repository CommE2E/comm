// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { ChatThreadItem } from '../selectors/chat-selectors';
import { chatThreadItemPropType } from '../selectors/chat-selectors';

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _sum from 'lodash/fp/sum';

import { chatListData } from '../selectors/chat-selectors';
import ChatThreadListItem from './chat-thread-list-item.react';
import { contentVerticalOffset } from '../dimensions';

class InnerChatThreadList extends React.PureComponent {

  props: {
    // Redux state
    chatListData: $ReadOnlyArray<ChatThreadItem>,
    userID: ?string,
  };
  static propTypes = {
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
    userID: PropTypes.string,
  };
  static navigationOptions = {
    tabBarLabel: 'Chat',
    tabBarIcon: ({ tintColor }) => (
      <Icon
        name="comments-o"
        style={[styles.icon, { color: tintColor }]}
      />
    ),
  };
  flatList: ?FlatList<ChatThreadItem> = null;

  renderItem = (row: { item: ChatThreadItem }) => {
    return <ChatThreadListItem data={row.item} userID={this.props.userID} />;
  }

  static keyExtractor(item: ChatThreadItem) {
    return item.threadInfo.id;
  }

  static getItemLayout(
    data: $ReadOnlyArray<ChatThreadItem>,
    index: number,
  ) {
    const offset =
      InnerChatThreadList.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? InnerChatThreadList.itemHeight(item) : 0;
    return { length, offset, index };
  }

  static itemHeight(item: ChatThreadItem): number {
    return 60;
  }

  static heightOfItems(data: $ReadOnlyArray<ChatThreadItem>): number {
    return _sum(data.map(InnerChatThreadList.itemHeight));
  }

  static ListHeaderComponent(props: {}) {
    return <View style={styles.header} />;
  }

  render() {
    return (
      <View style={styles.container}>
        <FlatList
          data={this.props.chatListData}
          renderItem={this.renderItem}
          keyExtractor={InnerChatThreadList.keyExtractor}
          getItemLayout={InnerChatThreadList.getItemLayout}
          ListHeaderComponent={InnerChatThreadList.ListHeaderComponent}
          extraData={this.props.userID}
          style={styles.flatList}
          ref={this.flatListRef}
        />
      </View>
    );
  }

  flatListRef = (flatList: ?FlatList<ChatThreadItem>) => {
    this.flatList = flatList;
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  header: {
    height: 5,
  },
  flatList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: contentVerticalOffset,
  },
});

const ChatThreadList = connect((state: AppState) => ({
  chatListData: chatListData(state),
  userID: state.userInfo && state.userInfo.id,
}))(InnerChatThreadList);

export {
  ChatThreadList,
};

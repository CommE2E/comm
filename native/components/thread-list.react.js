// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import PropTypes from 'prop-types';
import { FlatList, ViewPropTypes, Text } from 'react-native';

import ThreadListThread from './thread-list-thread.react';

type Props = {
  threadInfos: $ReadOnlyArray<ThreadInfo>,
  onSelect: (threadID: string) => void,
  itemStyle?: StyleObj,
  itemTextStyle?: StyleObj,
};
class ThreadList extends React.PureComponent<Props> {

  static propTypes = {
    threadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    onSelect: PropTypes.func.isRequired,
    itemStyle: ViewPropTypes.style,
    itemTextStyle: Text.propTypes.style,
  };

  render() {
    return (
      <FlatList
        data={this.props.threadInfos}
        renderItem={this.renderItem}
        keyExtractor={ThreadList.keyExtractor}
        getItemLayout={ThreadList.getItemLayout}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
      />
    );
  }

  static keyExtractor(threadInfo: ThreadInfo) {
    return threadInfo.id;
  }

  renderItem = (row: { item: ThreadInfo }) => {
    return (
      <ThreadListThread
        threadInfo={row.item}
        onSelect={this.props.onSelect}
        style={this.props.itemStyle}
        textStyle={this.props.itemTextStyle}
      />
    );
  }

  static getItemLayout(data: ?$ReadOnlyArray<ThreadInfo>, index: number) {
    return { length: 24, offset: 24 * index, index };
  }

}

export default ThreadList;

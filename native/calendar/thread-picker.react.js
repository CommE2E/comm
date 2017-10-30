// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableHighlight,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import invariant from 'invariant';

import { onScreenThreadInfos } from 'lib/selectors/thread-selectors';
import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import { includeDispatchActionProps } from 'lib/utils/action-utils';

import ThreadPickerThread from './thread-picker-thread.react';

type Props = {
  dateString: ?string,
  close: () => void,
  // Redux state
  onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
  viewerID: string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class ThreadPicker extends React.PureComponent<Props> {

  static propTypes = {
    dateString: PropTypes.string,
    close: PropTypes.func.isRequired,
    onScreenThreadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    viewerID: PropTypes.string.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  render() {
    return (
      <View style={styles.picker}>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            Pick a thread
          </Text>
          <TouchableHighlight
            onPress={this.props.close}
            style={styles.closeButton}
            underlayColor="#CCCCCCDD"
          >
            <Icon
              name="close"
              size={16}
              color="#AAAAAA"
              style={styles.closeButtonIcon}
            />
          </TouchableHighlight>
        </View>
        <FlatList
          data={this.props.onScreenThreadInfos}
          renderItem={this.renderItem}
          keyExtractor={ThreadPicker.keyExtractor}
          getItemLayout={ThreadPicker.getItemLayout}
          ItemSeparatorComponent={ThreadPicker.itemSeperator}
          style={styles.contents}
        />
      </View>
    );
  }

  static keyExtractor(threadInfo: ThreadInfo) {
    return threadInfo.id;
  }

  renderItem = (row: { item: ThreadInfo }) => {
    return (
      <ThreadPickerThread
        threadInfo={row.item}
        threadPicked={this.threadPicked}
      />
    );
  }

  static getItemLayout(data: ?$ReadOnlyArray<ThreadInfo>, index: number) {
    return { length: 24, offset: 24 * index, index };
  }

  static itemSeperator() {
    return <View style={styles.itemSeperator} />;
  }

  threadPicked = (threadID: string) => {
    this.props.close();
    const dateString = this.props.dateString;
    invariant(dateString, "should be set");
    this.props.dispatchActionPayload(
      createLocalEntryActionType,
      createLocalEntry(threadID, dateString, this.props.viewerID),
    );
  }

}

const styles = StyleSheet.create({
  picker: {
    flex: 1,
    marginLeft: 15,
    marginRight: 15,
    marginTop: 100,
    marginBottom: 100,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
  },
  header: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#CCCCCC',
    paddingTop: 15,
    paddingBottom: 14,
  },
  headerText: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333333',
  },
  contents: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  closeButtonIcon: {
    position: 'absolute',
    left: 3,
  },
  itemSeperator: {
    height: 1,
    backgroundColor: '#CCCCCC',
  },
});

export default connect(
  (state: AppState) => {
    const viewerID = state.currentUserInfo && state.currentUserInfo.id;
    invariant(viewerID, "should have viewer ID in to use ThreadPicker");
    return {
      onScreenThreadInfos: onScreenThreadInfos(state),
      viewerID,
    };
  },
  includeDispatchActionProps,
)(ThreadPicker);

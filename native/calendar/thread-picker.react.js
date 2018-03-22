// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import invariant from 'invariant';

import {
  onScreenEntryEditableThreadInfos,
} from 'lib/selectors/thread-selectors';
import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import { includeDispatchActionProps } from 'lib/utils/action-utils';

import ThreadList from '../components/thread-list.react';

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
        <Text style={styles.headerText}>
          Pick a thread
        </Text>
        <ThreadList
          threadInfos={this.props.onScreenThreadInfos}
          onSelect={this.threadPicked}
          itemStyle={styles.threadListItem}
        />
      </View>
    );
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
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 10,
    marginVertical: 100,
  },
  headerText: {
    fontSize: 24,
    textAlign: 'center',
    color: "black",
    paddingBottom: 8,
  },
  threadListItem: {
    paddingVertical: 2,
    paddingLeft: 10,
    paddingRight: 10,
  },
});

export default connect(
  (state: AppState) => {
    const viewerID = state.currentUserInfo && state.currentUserInfo.id;
    invariant(viewerID, "should have viewer ID in to use ThreadPicker");
    return {
      onScreenThreadInfos: onScreenEntryEditableThreadInfos(state),
      viewerID,
    };
  },
  includeDispatchActionProps,
)(ThreadPicker);

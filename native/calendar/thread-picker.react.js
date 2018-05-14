// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, Platform } from 'react-native';
import invariant from 'invariant';

import {
  onScreenEntryEditableThreadInfos,
} from 'lib/selectors/thread-selectors';
import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import { threadSearchIndex } from 'lib/selectors/nav-selectors';
import SearchIndex from 'lib/shared/search-index';
import { connect } from 'lib/utils/redux-utils';

import ThreadList from '../components/thread-list.react';
import KeyboardAvoidingModal from '../components/keyboard-avoiding-modal.react';

type Props = {
  dateString: ?string,
  close: () => void,
  // Redux state
  onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
  viewerID: string,
  threadSearchIndex: SearchIndex,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class ThreadPicker extends React.PureComponent<Props> {

  static propTypes = {
    dateString: PropTypes.string,
    close: PropTypes.func.isRequired,
    onScreenThreadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    viewerID: PropTypes.string.isRequired,
    threadSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  render() {
    return (
      <KeyboardAvoidingModal
        containerStyle={styles.container}
        style={styles.container}
      >
        <ThreadList
          threadInfos={this.props.onScreenThreadInfos}
          onSelect={this.threadPicked}
          itemStyle={styles.threadListItem}
          searchIndex={this.props.threadSearchIndex}
        />
      </KeyboardAvoidingModal>
    );
  }

  threadPicked = (threadID: string) => {
    this.props.close();
    const dateString = this.props.dateString;
    invariant(dateString, "should be set");
    setTimeout(
      () => this.props.dispatchActionPayload(
        createLocalEntryActionType,
        createLocalEntry(threadID, dateString, this.props.viewerID),
      ),
      Platform.OS === "android" ? 500 : 100,
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
      threadSearchIndex: threadSearchIndex(state),
    };
  },
  null,
  true,
)(ThreadPicker);

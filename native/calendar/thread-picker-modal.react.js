// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';

import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
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

import Modal from '../components/modal.react';
import ThreadList from '../components/thread-list.react';

type Props = {
  navigation:
    & { state: { params: { dateString: string } } }
    & NavigationScreenProp<NavigationLeafRoute>,
  // Redux state
  onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
  viewerID: ?string,
  threadSearchIndex: SearchIndex,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class ThreadPickerModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          dateString: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
    }).isRequired,
    onScreenThreadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    viewerID: PropTypes.string,
    threadSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Modal navigation={this.props.navigation}>
        <ThreadList
          threadInfos={this.props.onScreenThreadInfos}
          onSelect={this.threadPicked}
          itemStyle={styles.threadListItem}
          searchIndex={this.props.threadSearchIndex}
        />
      </Modal>
    );
  }

  threadPicked = (threadID: string) => {
    const { viewerID } = this.props;
    const { dateString } = this.props.navigation.state.params;
    invariant(dateString && viewerID, "should be set");
    this.props.dispatchActionPayload(
      createLocalEntryActionType,
      createLocalEntry(threadID, dateString, viewerID),
    );
  }

}

const styles = StyleSheet.create({
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
  (state: AppState) => ({
    onScreenThreadInfos: onScreenEntryEditableThreadInfos(state),
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    threadSearchIndex: threadSearchIndex(state),
  }),
  null,
  true,
)(ThreadPickerModal);

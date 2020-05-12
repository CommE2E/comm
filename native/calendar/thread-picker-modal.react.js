// @flow

import type { AppState } from '../redux/redux-setup';
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

import { onScreenEntryEditableThreadInfos } from 'lib/selectors/thread-selectors';
import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import { threadSearchIndex } from 'lib/selectors/nav-selectors';
import SearchIndex from 'lib/shared/search-index';
import { connect } from 'lib/utils/redux-utils';

import Modal from '../components/modal.react';
import ThreadList from '../components/thread-list.react';

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    presentedFrom: string,
    dateString: string,
  |},
|}>;

type Props = {
  navigation: NavProp,
  route: {|
    ...NavigationLeafRoute,
    params: {|
      presentedFrom: string,
      dateString: string,
    |},
  |},
  // Redux state
  onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
  viewerID: ?string,
  threadSearchIndex: SearchIndex,
  nextLocalID: number,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class ThreadPickerModal extends React.PureComponent<Props> {
  static propTypes = {
    navigation: PropTypes.object.isRequired,
    route: PropTypes.shape({
      params: PropTypes.shape({
        dateString: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    onScreenThreadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    viewerID: PropTypes.string,
    threadSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    nextLocalID: PropTypes.number.isRequired,
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
    const { viewerID, nextLocalID } = this.props;
    const { dateString } = this.props.route.params;
    invariant(dateString && viewerID, 'should be set');
    this.props.dispatchActionPayload(
      createLocalEntryActionType,
      createLocalEntry(threadID, nextLocalID, dateString, viewerID),
    );
  };
}

const styles = StyleSheet.create({
  threadListItem: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 2,
  },
});

export default connect(
  (state: AppState) => ({
    onScreenThreadInfos: onScreenEntryEditableThreadInfos(state),
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    threadSearchIndex: threadSearchIndex(state),
    nextLocalID: state.nextLocalID,
  }),
  null,
  true,
)(ThreadPickerModal);

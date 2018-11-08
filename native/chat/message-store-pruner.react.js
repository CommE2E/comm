// @flow

import type { AppState } from '../redux-setup';
import { messageStorePruneActionType } from 'lib/types/message-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  nextMessagePruneTimeSelector,
  pruneThreadIDsSelector,
} from '../selectors/message-selectors';

type Props = {|
  // Redux state
  nextMessagePruneTime: ?number,
  pruneThreadIDs: () => $ReadOnlyArray<string>,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class MessageStorePruner extends React.PureComponent<Props> {

  static propTypes = {
    nextMessagePruneTime: PropTypes.number,
    pruneThreadIDs: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  pruneTimeoutID: ?TimeoutID;

  componentDidMount() {
    this.setExpirationTimeout();
  }

  componentWillUnmount() {
    this.clearPruneTimeout();
  }

  componentDidUpdate(prevProps: Props) {
    this.setExpirationTimeout();
  }

  render() {
    return null;
  }

  clearPruneTimeout() {
    if (this.pruneTimeoutID) {
      clearTimeout(this.pruneTimeoutID);
      this.pruneTimeoutID = null;
    }
  }

  setExpirationTimeout() {
    this.clearPruneTimeout();
    const { nextMessagePruneTime } = this.props;
    if (nextMessagePruneTime === null || nextMessagePruneTime === undefined) {
      return;
    }
    const timeUntilExpiration = nextMessagePruneTime - Date.now();
    if (timeUntilExpiration <= 0) {
      this.dispatchMessageStorePruneAction();
    } else {
      this.pruneTimeoutID = setTimeout(
        this.dispatchMessageStorePruneAction,
        timeUntilExpiration,
      );
    }
    return false;
  }

  dispatchMessageStorePruneAction = () => {
    const threadIDs = this.props.pruneThreadIDs();
    if (threadIDs.length === 0) {
      return;
    }
    this.props.dispatchActionPayload(
      messageStorePruneActionType,
      { threadIDs },
    );
  }

}

export default connect(
  (state: AppState) => ({
    nextMessagePruneTime: nextMessagePruneTimeSelector(state),
    pruneThreadIDs: pruneThreadIDsSelector(state),
  }),
  null,
  true,
)(MessageStorePruner);

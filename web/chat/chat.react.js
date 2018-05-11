// @flow

import type { AppState } from '../redux-setup'

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { isStaff } from 'lib/shared/user-utils';

import css from './chat.css';
import ChatThreadList from './chat-thread-list.react';

type Props = {|
  // Redux state
  viewerID: ?string,
|};
class Chat extends React.PureComponent<Props> {

  static propTypes = {
    viewerID: PropTypes.string,
  };

  render() {
    if (!this.props.viewerID || !isStaff(this.props.viewerID)) {
      return (
        <div className={css['chat-container']}>
          <div className={css['chat-coming-soon']}>
            Chat coming soon!
          </div>
        </div>
      );
    }
    return (
      <div className={css['chat-container']}>
        <ChatThreadList />
        <div className={css['chat-content']}>
          <div className={css['chat-coming-soon']}>
            Chat coming soon!
          </div>
        </div>
      </div>
    );
  }

}

export default connect((state: AppState) => ({
  viewerID: state.currentUserInfo && state.currentUserInfo.id,
}))(Chat);

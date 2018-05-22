// @flow

import type { AppState } from '../redux-setup'

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { hasWebChat } from 'lib/shared/user-utils';

import css from './chat.css';
import ChatThreadList from './chat-thread-list.react';
import ChatMessageList from './chat-message-list.react';

type Props = {|
  // Redux state
  viewerID: ?string,
|};
class Chat extends React.PureComponent<Props> {

  static propTypes = {
    viewerID: PropTypes.string,
  };

  render() {
    if (!this.props.viewerID || !hasWebChat(this.props.viewerID)) {
      return (
        <div className={css.chatComingSoon}>
          Chat coming soon!
        </div>
      );
    }
    return (
      <React.Fragment>
        <ChatThreadList />
        <ChatMessageList />
      </React.Fragment>
    );
  }

}

export default connect((state: AppState) => ({
  viewerID: state.currentUserInfo && state.currentUserInfo.id,
}))(Chat);

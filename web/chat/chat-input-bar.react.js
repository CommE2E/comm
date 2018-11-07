// @flow

import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type ClientThreadJoinRequest,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import {
  type RawTextMessageInfo,
  type SendTextMessageResult,
  messageTypes,
} from 'lib/types/message-types';

import * as React from 'react';
import invariant from 'invariant';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faChevronRight from '@fortawesome/fontawesome-free-solid/faChevronRight';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import {
  sendMessageActionTypes,
  sendMessage,
} from 'lib/actions/message-actions';
import {
  joinThreadActionTypes,
  joinThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { getNewLocalID } from 'lib/utils/local-ids';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';

import css from './chat-message-list.css';
import LoadingIndicator from '../loading-indicator.react';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors';

type Props = {|
  threadInfo: ThreadInfo,
  // Redux state
  viewerID: ?string,
  joinThreadLoadingStatus: LoadingStatus,
  calendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendMessage: (
    threadID: string,
    text: string,
  ) => Promise<SendTextMessageResult>,
  joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
|};
type State = {|
  messageText: string,
|};
class ChatInputBar extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    viewerID: PropTypes.string,
    joinThreadLoadingStatus: loadingStatusPropType.isRequired,
    calendarQuery: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendMessage: PropTypes.func.isRequired,
    joinThread: PropTypes.func.isRequired,
  };
  state = {
    messageText: "",
  };
  textarea: ?HTMLTextAreaElement = null;

  componentDidMount() {
    this.updateHeight();
  }

  updateHeight = () => {
    const textarea = this.textarea;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }

  render() {
    const isMember = viewerIsMember(this.props.threadInfo);
    let joinButton = null;
    if (
      !isMember &&
      threadHasPermission(this.props.threadInfo, threadPermissions.JOIN_THREAD)
    ) {
      let buttonContent;
      if (this.props.joinThreadLoadingStatus === "loading") {
        buttonContent = (
          <LoadingIndicator
            status={this.props.joinThreadLoadingStatus}
            size="medium"
            color="white"
          />
        );
      } else {
        buttonContent = (
          <span className={css.joinButtonText}>Join Thread</span>
        );
      }
      joinButton = (
        <div className={css.joinButtonContainer}>
          <a onClick={this.onClickJoin}>
            {buttonContent}
          </a>
        </div>
      );
    }

    let content;
    if (threadHasPermission(this.props.threadInfo, threadPermissions.VOICED)) {
      content = (
        <div className={css.inputBarTextInput}>
          <textarea
            rows="1"
            placeholder="Send a message..."
            value={this.state.messageText}
            onChange={this.onChangeMessageText}
            onKeyDown={this.onKeyDown}
            ref={this.textareaRef}
          />
          <a className={css.send} onClick={this.onSend}>
            Send
            <FontAwesomeIcon
              icon={faChevronRight}
              className={css.sendButton}
            />
          </a>
        </div>
      );
    } else if (isMember) {
      content = (
        <span className={css.explanation}>
          You don't have permission to send messages.
        </span>
      );
    } else {
      const defaultRoleID = Object.keys(this.props.threadInfo.roles)
        .find(roleID => this.props.threadInfo.roles[roleID].isDefault);
      invariant(
        defaultRoleID !== undefined,
        "all threads should have a default role",
      );
      const defaultRole = this.props.threadInfo.roles[defaultRoleID];
      const membersAreVoiced =
        !!defaultRole.permissions[threadPermissions.VOICED];
      if (membersAreVoiced) {
        content = (
          <span className={css.explanation}>
            Join this thread to send messages.
          </span>
        );
      } else {
        content = (
          <span className={css.explanation}>
            You don't have permission to send messages.
          </span>
        );
      }
    }

    return (
      <div className={css.inputBar}>
        {joinButton}
        {content}
      </div>
    );
  }

  textareaRef = (textarea: ?HTMLTextAreaElement) => {
    this.textarea = textarea;
  }

  onChangeMessageText = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const messageText = event.currentTarget.value;
    this.updateText(messageText);
  }

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  updateText(messageText: string) {
    this.setState({ messageText }, this.updateHeight);
  }

  onSend = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.send();
  }

  send() {
    const text = this.state.messageText.trim();
    if (!text) {
      // TODO we should make the send button appear dynamically
      // iff trimmed text is nonempty, just like native
      return;
    }
    this.updateText("");
    const localID = `local${getNewLocalID()}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, "should have viewer ID in order to send a message");
    const messageInfo = ({
      type: messageTypes.TEXT,
      localID,
      threadID: this.props.threadInfo.id,
      text,
      creatorID,
      time: Date.now(),
    }: RawTextMessageInfo);
    this.props.dispatchActionPromise(
      sendMessageActionTypes,
      this.sendMessageAction(messageInfo),
      undefined,
      messageInfo,
    );
  }

  async sendMessageAction(messageInfo: RawTextMessageInfo) {
    try {
      const result = await this.props.sendMessage(
        messageInfo.threadID,
        messageInfo.text,
      );
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        "localID should be set",
      );
      return {
        localID,
        serverID: result.id,
        threadID: messageInfo.threadID,
        time: result.time,
      };
    } catch (e) {
      e.localID = messageInfo.localID;
      e.threadID = messageInfo.threadID;
      throw e;
    }
  }

  onClickJoin = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      joinThreadActionTypes,
      this.joinAction(),
    );
  }

  async joinAction() {
    const query = this.props.calendarQuery();
    return await this.props.joinThread({
      threadID: this.props.threadInfo.id,
      calendarQuery: {
        startDate: query.startDate,
        endDate: query.endDate,
        filters: [
          ...query.filters,
          { type: "threads", threadIDs: [this.props.threadInfo.id] },
        ],
      },
    });
  }

}

const joinThreadLoadingStatusSelector
  = createLoadingStatusSelector(joinThreadActionTypes);

export default connect(
  (state: AppState) => ({
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    joinThreadLoadingStatus: joinThreadLoadingStatusSelector(state),
    calendarQuery: nonThreadCalendarQuery(state),
  }),
  { sendMessage, joinThread },
)(ChatInputBar);

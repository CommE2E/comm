// @flow

import type { AppState } from '../redux-setup';
import type {
  DispatchActionPromise,
  DispatchActionPayload,
} from 'lib/utils/action-utils';
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
  type RawMultimediaMessageInfo,
  type SendMessageResult,
  messageTypes,
} from 'lib/types/message-types';
import {
  chatInputStatePropType,
  type ChatInputState,
  type PendingMultimediaUpload,
} from './chat-input-state';

import * as React from 'react';
import invariant from 'invariant';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faChevronRight from '@fortawesome/fontawesome-free-solid/faChevronRight';
import faFileImage from '@fortawesome/fontawesome-free-regular/faFileImage';
import PropTypes from 'prop-types';
import _difference from 'lodash/fp/difference';

import { connect } from 'lib/utils/redux-utils';
import {
  sendTextMessageActionTypes,
  sendTextMessage,
  createLocalMultimediaMessageActionType,
} from 'lib/actions/message-actions';
import {
  joinThreadActionTypes,
  joinThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';
import { isStaff } from 'lib/shared/user-utils';

import css from './chat-message-list.css';
import LoadingIndicator from '../loading-indicator.react';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors';
import { allowedMimeTypeString } from '../utils/media-utils';
import Multimedia from './multimedia.react';

type Props = {|
  threadInfo: ThreadInfo,
  chatInputState: ChatInputState,
  // Redux state
  viewerID: ?string,
  joinThreadLoadingStatus: LoadingStatus,
  calendarQuery: () => CalendarQuery,
  nextLocalID: number,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  dispatchActionPayload: DispatchActionPayload,
  // async functions that hit server APIs
  sendTextMessage: (
    threadID: string,
    localID: string,
    text: string,
  ) => Promise<SendMessageResult>,
  joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
|};
class ChatInputBar extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    chatInputState: chatInputStatePropType.isRequired,
    viewerID: PropTypes.string,
    joinThreadLoadingStatus: loadingStatusPropType.isRequired,
    calendarQuery: PropTypes.func.isRequired,
    nextLocalID: PropTypes.number.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    sendTextMessage: PropTypes.func.isRequired,
    joinThread: PropTypes.func.isRequired,
  };
  textarea: ?HTMLTextAreaElement;
  multimediaInput: ?HTMLInputElement;

  componentDidMount() {
    this.updateHeight();
  }

  componentDidUpdate(prevProps: Props) {
    const { chatInputState } = this.props;
    const prevChatInputState = prevProps.chatInputState;
    if (chatInputState.draft !== prevChatInputState.draft) {
      this.updateHeight();
    }
    if (
      this.multimediaInput &&
      _difference(
        ChatInputBar.unassignedUploadIDs(prevChatInputState.pendingUploads),
      )(
        ChatInputBar.unassignedUploadIDs(chatInputState.pendingUploads),
      ).length > 0
    ) {
      // Whenever a pending upload is removed, we reset the file
      // HTMLInputElement's value field, so that if the same upload occurs again
      // the onChange call doesn't get filtered
      this.multimediaInput.value = "";
    }
  }

  static unassignedUploadIDs(
    pendingUploads: $ReadOnlyArray<PendingMultimediaUpload>,
  ) {
    return pendingUploads.filter(
      (pendingUpload: PendingMultimediaUpload) => !pendingUpload.messageID,
    ).map(
      (pendingUpload: PendingMultimediaUpload) => pendingUpload.localID,
    );
  }

  updateHeight() {
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

    const { pendingUploads, cancelPendingUpload } = this.props.chatInputState;
    const multimediaPreviews = pendingUploads.map(pendingUpload => (
      <Multimedia
        uri={pendingUpload.uri}
        pendingUpload={pendingUpload}
        remove={cancelPendingUpload}
        key={pendingUpload.localID}
      />
    ));
    const previews = multimediaPreviews.length > 0
      ? <div className={css.previews}>{multimediaPreviews}</div>
      : null;

    let content;
    if (threadHasPermission(this.props.threadInfo, threadPermissions.VOICED)) {
      let multimediaUpload = null;
      if (this.props.viewerID && isStaff(this.props.viewerID)) {
        multimediaUpload = (
          <a className={css.multimediaUpload} onClick={this.onMultimediaClick}>
            <input
              type="file"
              onChange={this.onMultimediaFileChange}
              ref={this.multimediaInputRef}
              accept={allowedMimeTypeString}
              multiple
            />
            <FontAwesomeIcon
              icon={faFileImage}
            />
          </a>
        );
      }
      content = (
        <div className={css.inputBarTextInput}>
          <textarea
            rows="1"
            placeholder="Send a message..."
            value={this.props.chatInputState.draft}
            onChange={this.onChangeMessageText}
            onKeyDown={this.onKeyDown}
            ref={this.textareaRef}
          />
          {multimediaUpload}
          <a className={css.send} onClick={this.onSend}>
            <FontAwesomeIcon
              icon={faChevronRight}
              className={css.sendButton}
            />
            Send
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
        {previews}
        {content}
      </div>
    );
  }

  textareaRef = (textarea: ?HTMLTextAreaElement) => {
    this.textarea = textarea;
  }

  onChangeMessageText = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    this.props.chatInputState.setDraft(event.currentTarget.value);
  }

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onSend = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.send();
  }

  send() {
    const text = this.props.chatInputState.draft.trim();
    if (text) {
      // TODO we should make the send button appear dynamically
      // iff trimmed text is nonempty, just like native
      this.dispatchTextMessageAction(text);
    }

    const { pendingUploads } = this.props.chatInputState;
    if (pendingUploads.length > 0) {
      this.dispatchMultimediaMessageAction(pendingUploads);
    }
  }

  dispatchTextMessageAction(text: string) {
    this.props.chatInputState.setDraft("");

    const localID = `local${this.props.nextLocalID}`;
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
      sendTextMessageActionTypes,
      this.sendTextMessageAction(messageInfo),
      undefined,
      messageInfo,
    );
  }

  async sendTextMessageAction(messageInfo: RawTextMessageInfo) {
    try {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        "localID should be set",
      );
      const result = await this.props.sendTextMessage(
        messageInfo.threadID,
        localID,
        messageInfo.text,
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

  multimediaInputRef = (multimediaInput: ?HTMLInputElement) => {
    this.multimediaInput = multimediaInput;
  }

  onMultimediaClick = (event: SyntheticEvent<HTMLInputElement>) => {
    if (this.multimediaInput) {
      this.multimediaInput.click();
    }
  }

  onMultimediaFileChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.props.chatInputState.appendFiles([...event.target.files]);
  }

  dispatchMultimediaMessageAction(
    pendingUploads: $ReadOnlyArray<PendingMultimediaUpload>,
  ) {
    const localID = `local${this.props.nextLocalID}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, "should have viewer ID in order to send a message");
    const messageInfo = ({
      type: messageTypes.MULTIMEDIA,
      localID,
      threadID: this.props.threadInfo.id,
      creatorID,
      time: Date.now(),
      media: pendingUploads.map(({ localID, serverID, uri, mediaType }) => ({
        id: serverID ? serverID : localID,
        uri,
        type: mediaType,
      })),
    }: RawMultimediaMessageInfo);
    // This call triggers a setState in ChatInputStateContainer. We hope that
    // propagates quicker than the createLocalMultimediaMessageActionType call
    // below, since ChatInputStateContainer's appendFiles (which handles the
    // upload) relies on the aforementioned setState to know which pending
    // uploads are associated to local messages and thus necessitate Redux
    // actions to update the messageStore.
    this.props.chatInputState.assignPendingUploads(localID);
    this.props.dispatchActionPayload(
      createLocalMultimediaMessageActionType,
      { messageInfo },
    );
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
    nextLocalID: state.nextLocalID,
  }),
  { sendTextMessage, joinThread },
)(ChatInputBar);

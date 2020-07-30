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
import { messageTypes } from 'lib/types/message-types';
import {
  inputStatePropType,
  type InputState,
  type PendingMultimediaUpload,
} from '../input/input-state';

import * as React from 'react';
import invariant from 'invariant';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { faFileImage } from '@fortawesome/free-regular-svg-icons';
import PropTypes from 'prop-types';
import _difference from 'lodash/fp/difference';

import { connect } from 'lib/utils/redux-utils';
import { joinThreadActionTypes, joinThread } from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';
import { trimMessage } from 'lib/shared/message-utils';

import css from './chat-message-list.css';
import LoadingIndicator from '../loading-indicator.react';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors';
import { allowedMimeTypeString } from '../media/file-utils';
import Multimedia from '../media/multimedia.react';

type Props = {|
  threadInfo: ThreadInfo,
  inputState: InputState,
  // Redux state
  viewerID: ?string,
  joinThreadLoadingStatus: LoadingStatus,
  calendarQuery: () => CalendarQuery,
  nextLocalID: number,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  dispatchActionPayload: DispatchActionPayload,
  // async functions that hit server APIs
  joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
|};
class ChatInputBar extends React.PureComponent<Props> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    inputState: inputStatePropType.isRequired,
    viewerID: PropTypes.string,
    joinThreadLoadingStatus: loadingStatusPropType.isRequired,
    calendarQuery: PropTypes.func.isRequired,
    nextLocalID: PropTypes.number.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    joinThread: PropTypes.func.isRequired,
  };
  textarea: ?HTMLTextAreaElement;
  multimediaInput: ?HTMLInputElement;

  componentDidMount() {
    this.updateHeight();
  }

  componentDidUpdate(prevProps: Props) {
    const { inputState } = this.props;
    const prevInputState = prevProps.inputState;
    if (inputState.draft !== prevInputState.draft) {
      this.updateHeight();
    }
    const curUploadIDs = ChatInputBar.unassignedUploadIDs(
      inputState.pendingUploads,
    );
    const prevUploadIDs = ChatInputBar.unassignedUploadIDs(
      prevInputState.pendingUploads,
    );
    if (
      this.multimediaInput &&
      _difference(prevUploadIDs)(curUploadIDs).length > 0
    ) {
      // Whenever a pending upload is removed, we reset the file
      // HTMLInputElement's value field, so that if the same upload occurs again
      // the onChange call doesn't get filtered
      this.multimediaInput.value = '';
    } else if (
      this.textarea &&
      _difference(curUploadIDs)(prevUploadIDs).length > 0
    ) {
      // Whenever a pending upload is added, we focus the textarea
      this.textarea.focus();
      return;
    }

    if (this.props.threadInfo.id !== prevProps.threadInfo.id && this.textarea) {
      this.textarea.focus();
    }
  }

  static unassignedUploadIDs(
    pendingUploads: $ReadOnlyArray<PendingMultimediaUpload>,
  ) {
    return pendingUploads
      .filter(
        (pendingUpload: PendingMultimediaUpload) => !pendingUpload.messageID,
      )
      .map((pendingUpload: PendingMultimediaUpload) => pendingUpload.localID);
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
      if (this.props.joinThreadLoadingStatus === 'loading') {
        buttonContent = (
          <LoadingIndicator
            status={this.props.joinThreadLoadingStatus}
            size="medium"
            color="white"
          />
        );
      } else {
        buttonContent = <span className={css.joinButtonText}>Join Thread</span>;
      }
      joinButton = (
        <div className={css.joinButtonContainer}>
          <a onClick={this.onClickJoin}>{buttonContent}</a>
        </div>
      );
    }

    const { pendingUploads, cancelPendingUpload } = this.props.inputState;
    const multimediaPreviews = pendingUploads.map(pendingUpload => (
      <Multimedia
        uri={pendingUpload.uri}
        pendingUpload={pendingUpload}
        remove={cancelPendingUpload}
        multimediaCSSClass={css.multimedia}
        multimediaImageCSSClass={css.multimediaImage}
        key={pendingUpload.localID}
      />
    ));
    const previews =
      multimediaPreviews.length > 0 ? (
        <div className={css.previews}>{multimediaPreviews}</div>
      ) : null;

    let content;
    if (threadHasPermission(this.props.threadInfo, threadPermissions.VOICED)) {
      content = (
        <div className={css.inputBarTextInput}>
          <textarea
            rows="1"
            placeholder="Send a message..."
            value={this.props.inputState.draft}
            onChange={this.onChangeMessageText}
            onKeyDown={this.onKeyDown}
            ref={this.textareaRef}
            autoFocus
          />
          <a className={css.multimediaUpload} onClick={this.onMultimediaClick}>
            <input
              type="file"
              onChange={this.onMultimediaFileChange}
              ref={this.multimediaInputRef}
              accept={allowedMimeTypeString}
              multiple
            />
            <FontAwesomeIcon icon={faFileImage} />
          </a>
          <a className={css.send} onClick={this.onSend}>
            <FontAwesomeIcon icon={faChevronRight} className={css.sendButton} />
            Send
          </a>
        </div>
      );
    } else if (isMember) {
      content = (
        <span className={css.explanation}>
          You don&apos;t have permission to send messages.
        </span>
      );
    } else {
      const defaultRoleID = Object.keys(this.props.threadInfo.roles).find(
        roleID => this.props.threadInfo.roles[roleID].isDefault,
      );
      invariant(
        defaultRoleID !== undefined,
        'all threads should have a default role',
      );
      const defaultRole = this.props.threadInfo.roles[defaultRoleID];
      const membersAreVoiced = !!defaultRole.permissions[
        threadPermissions.VOICED
      ];
      if (membersAreVoiced) {
        content = (
          <span className={css.explanation}>
            Join this thread to send messages.
          </span>
        );
      } else {
        content = (
          <span className={css.explanation}>
            You don&apos;t have permission to send messages.
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
    if (textarea) {
      textarea.focus();
    }
  };

  onChangeMessageText = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    this.props.inputState.setDraft(event.currentTarget.value);
  };

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  };

  onSend = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.send();
  };

  send() {
    let { nextLocalID } = this.props;

    const text = trimMessage(this.props.inputState.draft);
    if (text) {
      // TODO we should make the send button appear dynamically
      // iff trimmed text is nonempty, just like native
      this.dispatchTextMessageAction(text, nextLocalID);
      nextLocalID++;
    }

    this.props.inputState.createMultimediaMessage(nextLocalID);
  }

  dispatchTextMessageAction(text: string, nextLocalID: number) {
    this.props.inputState.setDraft('');

    const localID = `local${nextLocalID}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, 'should have viewer ID in order to send a message');
    this.props.inputState.sendTextMessage({
      type: messageTypes.TEXT,
      localID,
      threadID: this.props.threadInfo.id,
      text,
      creatorID,
      time: Date.now(),
    });
  }

  multimediaInputRef = (multimediaInput: ?HTMLInputElement) => {
    this.multimediaInput = multimediaInput;
  };

  onMultimediaClick = () => {
    if (this.multimediaInput) {
      this.multimediaInput.click();
    }
  };

  onMultimediaFileChange = async (
    event: SyntheticInputEvent<HTMLInputElement>,
  ) => {
    const result = await this.props.inputState.appendFiles([
      ...event.target.files,
    ]);
    if (!result && this.multimediaInput) {
      this.multimediaInput.value = '';
    }
  };

  onClickJoin = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(joinThreadActionTypes, this.joinAction());
  };

  async joinAction() {
    const query = this.props.calendarQuery();
    return await this.props.joinThread({
      threadID: this.props.threadInfo.id,
      calendarQuery: {
        startDate: query.startDate,
        endDate: query.endDate,
        filters: [
          ...query.filters,
          { type: 'threads', threadIDs: [this.props.threadInfo.id] },
        ],
      },
    });
  }
}

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);

export default connect(
  (state: AppState) => ({
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    joinThreadLoadingStatus: joinThreadLoadingStatusSelector(state),
    calendarQuery: nonThreadCalendarQuery(state),
    nextLocalID: state.nextLocalID,
  }),
  { joinThread },
)(ChatInputBar);

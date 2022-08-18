// @flow

import invariant from 'invariant';
import _difference from 'lodash/fp/difference';
import * as React from 'react';

import {
  joinThreadActionTypes,
  joinThread,
  newThreadActionTypes,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { localIDPrefix, trimMessage } from 'lib/shared/message-utils';
import {
  threadHasPermission,
  viewerIsMember,
  threadFrozenDueToViewerBlock,
  threadActualMembers,
  checkIfDefaultMembersAreVoiced,
} from 'lib/shared/thread-utils';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { messageTypes } from 'lib/types/message-types';
import {
  type ThreadInfo,
  threadPermissions,
  type ClientThreadJoinRequest,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import { type UserInfos } from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import {
  type InputState,
  type PendingMultimediaUpload,
} from '../input/input-state';
import LoadingIndicator from '../loading-indicator.react';
import { allowedMimeTypeString } from '../media/file-utils';
import Multimedia from '../media/multimedia.react';
import { useSelector } from '../redux/redux-utils';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-input-bar.css';

type BaseProps = {
  +threadInfo: ThreadInfo,
  +inputState: InputState,
};
type Props = {
  ...BaseProps,
  // Redux state
  +viewerID: ?string,
  +joinThreadLoadingStatus: LoadingStatus,
  +threadCreationInProgress: boolean,
  +calendarQuery: () => CalendarQuery,
  +nextLocalID: number,
  +isThreadActive: boolean,
  +userInfos: UserInfos,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
};
class ChatInputBar extends React.PureComponent<Props> {
  textarea: ?HTMLTextAreaElement;
  multimediaInput: ?HTMLInputElement;

  componentDidMount() {
    this.updateHeight();
    if (this.props.isThreadActive) {
      this.addReplyListener();
    }
  }

  componentWillUnmount() {
    if (this.props.isThreadActive) {
      this.removeReplyListener();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.isThreadActive && !prevProps.isThreadActive) {
      this.addReplyListener();
    } else if (!this.props.isThreadActive && prevProps.isThreadActive) {
      this.removeReplyListener();
    }

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

  addReplyListener() {
    invariant(
      this.props.inputState,
      'inputState should be set in addReplyListener',
    );
    this.props.inputState.addReplyListener(this.focusAndUpdateText);
  }

  removeReplyListener() {
    invariant(
      this.props.inputState,
      'inputState should be set in removeReplyListener',
    );
    this.props.inputState.removeReplyListener(this.focusAndUpdateText);
  }

  render() {
    const isMember = viewerIsMember(this.props.threadInfo);
    const canJoin = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.JOIN_THREAD,
    );

    let joinButton = null;
    if (!isMember && canJoin && !this.props.threadCreationInProgress) {
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
        buttonContent = (
          <>
            <SWMansionIcon icon="plus" size={24} />
            <p className={css.joinButtonText}>Join Chat</p>
          </>
        );
      }
      joinButton = (
        <div className={css.joinButtonContainer}>
          <button
            onClick={this.onClickJoin}
            className={css.joinButton}
            style={{ backgroundColor: `#${this.props.threadInfo.color}` }}
          >
            {buttonContent}
          </button>
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
    // If the thread is created by somebody else while the viewer is attempting
    // to create it, the threadInfo might be modified in-place and won't
    // list the viewer as a member, which will end up hiding the input. In
    // this case, we will assume that our creation action will get translated,
    // into a join and as long as members are voiced, we can show the input.
    const defaultMembersAreVoiced = checkIfDefaultMembersAreVoiced(
      this.props.threadInfo,
    );

    let sendButton;
    if (this.props.inputState.draft.length) {
      sendButton = (
        <a onClick={this.onSend} className={css.sendButton}>
          <SWMansionIcon
            icon="send-2"
            size={22}
            color={`#${this.props.threadInfo.color}`}
          />
        </a>
      );
    }

    if (
      threadHasPermission(this.props.threadInfo, threadPermissions.VOICED) ||
      (this.props.threadCreationInProgress && defaultMembersAreVoiced)
    ) {
      content = (
        <div className={css.inputBarWrapper}>
          <a className={css.multimediaUpload} onClick={this.onMultimediaClick}>
            <input
              type="file"
              onChange={this.onMultimediaFileChange}
              ref={this.multimediaInputRef}
              accept={allowedMimeTypeString}
              multiple
            />
            <SWMansionIcon
              icon="image-1"
              size={22}
              color={`#${this.props.threadInfo.color}`}
              disableFill
            />
          </a>
          <div className={css.inputBarTextInput}>
            <textarea
              rows="1"
              placeholder="Type your message"
              value={this.props.inputState.draft}
              onChange={this.onChangeMessageText}
              onKeyDown={this.onKeyDown}
              ref={this.textareaRef}
              autoFocus
            />
          </div>
          {sendButton}
        </div>
      );
    } else if (
      threadFrozenDueToViewerBlock(
        this.props.threadInfo,
        this.props.viewerID,
        this.props.userInfos,
      ) &&
      threadActualMembers(this.props.threadInfo.members).length === 2
    ) {
      content = (
        <span className={css.explanation}>
          You can&apos;t send messages to a user that you&apos;ve blocked.
        </span>
      );
    } else if (isMember) {
      content = (
        <span className={css.explanation}>
          You don&apos;t have permission to send messages.
        </span>
      );
    } else if (defaultMembersAreVoiced && canJoin) {
      content = null;
    } else {
      content = (
        <span className={css.explanation}>
          You don&apos;t have permission to send messages.
        </span>
      );
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

  focusAndUpdateText = (text: string) => {
    // We need to call focus() first on Safari, otherwise the cursor
    // ends up at the start instead of the end for some reason
    const { textarea } = this;
    invariant(textarea, 'textarea should be set');
    textarea.focus();

    // We reset the textarea to an empty string at the start so that the cursor
    // always ends up at the end, even if the text doesn't actually change
    textarea.value = '';
    const currentText = this.props.inputState.draft;
    if (!currentText.startsWith(text)) {
      const prependedText = text.concat(currentText);
      this.props.inputState.setDraft(prependedText);
      textarea.value = prependedText;
    } else {
      textarea.value = currentText;
    }

    // The above strategies make sure the cursor is at the end,
    // but we also need to make sure that we're scrolled to the bottom
    textarea.scrollTop = textarea.scrollHeight;
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
    if (this.props.inputState.pendingUploads.length > 0) {
      this.props.inputState.createMultimediaMessage(
        nextLocalID,
        this.props.threadInfo,
      );
    }
  }

  dispatchTextMessageAction(text: string, nextLocalID: number) {
    this.props.inputState.setDraft('');

    const localID = `${localIDPrefix}${nextLocalID}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, 'should have viewer ID in order to send a message');

    this.props.inputState.sendTextMessage(
      {
        type: messageTypes.TEXT,
        localID,
        threadID: this.props.threadInfo.id,
        text,
        creatorID,
        time: Date.now(),
      },
      this.props.threadInfo,
    );
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
const createThreadLoadingStatusSelector = createLoadingStatusSelector(
  newThreadActionTypes,
);

const ConnectedChatInputBar: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedChatInputBar(props) {
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const nextLocalID = useSelector(state => state.nextLocalID);
    const isThreadActive = useSelector(
      state => props.threadInfo.id === state.navInfo.activeChatThreadID,
    );
    const userInfos = useSelector(state => state.userStore.userInfos);
    const joinThreadLoadingStatus = useSelector(
      joinThreadLoadingStatusSelector,
    );
    const createThreadLoadingStatus = useSelector(
      createThreadLoadingStatusSelector,
    );
    const threadCreationInProgress = createThreadLoadingStatus === 'loading';
    const calendarQuery = useSelector(nonThreadCalendarQuery);
    const dispatchActionPromise = useDispatchActionPromise();
    const callJoinThread = useServerCall(joinThread);

    return (
      <ChatInputBar
        {...props}
        viewerID={viewerID}
        joinThreadLoadingStatus={joinThreadLoadingStatus}
        threadCreationInProgress={threadCreationInProgress}
        calendarQuery={calendarQuery}
        nextLocalID={nextLocalID}
        isThreadActive={isThreadActive}
        userInfos={userInfos}
        dispatchActionPromise={dispatchActionPromise}
        joinThread={callJoinThread}
      />
    );
  },
);

export default ConnectedChatInputBar;

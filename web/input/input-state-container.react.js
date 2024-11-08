// @flow

import invariant from 'invariant';
import _groupBy from 'lodash/fp/groupBy.js';
import _keyBy from 'lodash/fp/keyBy.js';
import _omit from 'lodash/fp/omit.js';
import _partition from 'lodash/fp/partition.js';
import _sortBy from 'lodash/fp/sortBy.js';
import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { createSelector } from 'reselect';

import {
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendTextMessageActionTypes,
} from 'lib/actions/message-actions.js';
import { queueReportsActionType } from 'lib/actions/report-actions.js';
import { useNewThinThread } from 'lib/actions/thread-actions.js';
import {
  type BlobServiceUploadAction,
  type DeleteUploadInput,
  type MultimediaUploadCallbacks,
  type MultimediaUploadExtras,
  updateMultimediaMessageMediaActionType,
  uploadMultimedia,
  useBlobServiceUpload,
  useDeleteUpload,
} from 'lib/actions/upload-actions.js';
import {
  type PushModal,
  useModalContext,
} from 'lib/components/modal-provider.react.js';
import blobService from 'lib/facts/blob-service.js';
import {
  type SendMultimediaMessagePayload,
  useInputStateContainerSendMultimediaMessage,
  useInputStateContainerSendTextMessage,
} from 'lib/hooks/input-state-container-hooks.js';
import { useNewThickThread } from 'lib/hooks/thread-hooks.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { getNextLocalUploadID } from 'lib/media/media-utils.js';
import { pendingToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type { IdentityClientContextType } from 'lib/shared/identity-client-context.js';
import {
  createMediaMessageInfo,
  localIDPrefix,
  useMessageCreationSideEffectsFunc,
  getNextLocalID,
} from 'lib/shared/message-utils.js';
import type { CreationSideEffectsFunc } from 'lib/shared/messages/message-spec.js';
import { createRealThreadFromPendingThread } from 'lib/shared/thread-actions-utils.js';
import {
  draftKeyFromThreadID,
  patchThreadInfoToIncludeMentionedMembersOfParent,
  threadIsPending,
  threadIsPendingSidebar,
} from 'lib/shared/thread-utils.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import type {
  MediaMission,
  MediaMissionFailure,
  MediaMissionResult,
  MediaMissionStep,
  UploadMultimediaResult,
} from 'lib/types/media-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  type RawMessageInfo,
  type RawMultimediaMessageInfo,
  type SendMessagePayload,
} from 'lib/types/message-types.js';
import type { RawImagesMessageInfo } from 'lib/types/messages/images.js';
import type { RawMediaMessageInfo } from 'lib/types/messages/media.js';
import type { RawTextMessageInfo } from 'lib/types/messages/text.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import { reportTypes } from 'lib/types/report-types.js';
import {
  threadTypeIsSidebar,
  threadTypeIsThick,
} from 'lib/types/thread-types-enum.js';
import type { ThreadType } from 'lib/types/thread-types-enum.js';
import {
  type ClientNewThinThreadRequest,
  type NewThreadResult,
  type NewThickThreadRequest,
} from 'lib/types/thread-types.js';
import {
  blobHashFromBlobServiceURI,
  isBlobServiceURI,
  makeBlobServiceEndpointURL,
} from 'lib/utils/blob-service.js';
import { getConfig } from 'lib/utils/config.js';
import { getMessageForException, SendMessageError } from 'lib/utils/errors.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { generateReportID } from 'lib/utils/report-utils.js';
import { createDefaultHTTPRequestHeaders } from 'lib/utils/services-utils.js';

import {
  type BaseInputState,
  type InputState,
  InputStateContext,
  type PendingMultimediaUpload,
  type TypeaheadInputState,
  type TypeaheadState,
} from './input-state.js';
import { encryptFile } from '../media/encryption-utils.js';
import { generateThumbHash } from '../media/image-utils.js';
import {
  preloadImage,
  preloadMediaResource,
  validateFile,
} from '../media/media-utils.js';
import InvalidUploadModal from '../modals/chat/invalid-upload.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors.js';

type CombinedInputState = {
  +inputBaseState: BaseInputState,
  +typeaheadState: TypeaheadInputState,
};

type BaseProps = {
  +children: React.Node,
};
type Props = {
  ...BaseProps,
  +activeChatThreadID: ?string,
  +drafts: { +[key: string]: string },
  +viewerID: ?string,
  +messageStoreMessages: { +[id: string]: RawMessageInfo },
  +pendingRealizedThreadIDs: $ReadOnlyMap<string, string>,
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  +calendarQuery: () => CalendarQuery,
  +uploadMultimedia: (
    multimedia: Object,
    extras: MultimediaUploadExtras,
    callbacks: MultimediaUploadCallbacks,
  ) => Promise<UploadMultimediaResult>,
  +blobServiceUpload: BlobServiceUploadAction,
  +deleteUpload: (input: DeleteUploadInput) => Promise<void>,
  +sendMultimediaMessage: (
    messageInfo: RawMultimediaMessageInfo,
    sidebarCreation: boolean,
    isLegacy: boolean,
  ) => Promise<SendMultimediaMessagePayload>,
  +sendTextMessage: (
    messageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
    sidebarCreation: boolean,
  ) => Promise<SendMessagePayload>,
  +newThinThread: (
    request: ClientNewThinThreadRequest,
  ) => Promise<NewThreadResult>,
  +newThickThread: (request: NewThickThreadRequest) => Promise<string>,
  +pushModal: PushModal,
  +sendCallbacks: $ReadOnlyArray<() => mixed>,
  +registerSendCallback: (() => mixed) => void,
  +unregisterSendCallback: (() => mixed) => void,
  +textMessageCreationSideEffectsFunc: CreationSideEffectsFunc<RawTextMessageInfo>,
  +identityContext: ?IdentityClientContextType,
};
type WritableState = {
  pendingUploads: {
    [threadID: string]: { [localUploadID: string]: PendingMultimediaUpload },
  },
  textCursorPositions: { [threadID: string]: number },
  typeaheadState: TypeaheadState,
};
type State = $ReadOnly<WritableState>;

type PropsAndState = {
  ...Props,
  ...State,
};

class InputStateContainer extends React.PureComponent<Props, State> {
  state: State = {
    pendingUploads: {},
    textCursorPositions: {},
    typeaheadState: {
      canBeVisible: false,
      keepUpdatingThreadMembers: true,
      frozenUserMentionsCandidates: [],
      frozenChatMentionsCandidates: {},
      moveChoiceUp: null,
      moveChoiceDown: null,
      close: null,
      accept: null,
    },
  };
  replyCallbacks: Array<(message: string) => void> = [];
  pendingThreadCreations: Map<
    string,
    Promise<{
      +threadID: string,
      +threadType: ThreadType,
    }>,
  > = new Map<
    string,
    Promise<{
      +threadID: string,
      +threadType: ThreadType,
    }>,
  >();

  useBlobServiceUploads = true;

  // When the user sends a multimedia message that triggers the creation of a
  // sidebar, the sidebar gets created right away, but the message needs to wait
  // for the uploads to complete before sending. We use this Set to track the
  // message localIDs that need sidebarCreation: true.
  pendingSidebarCreationMessageLocalIDs: Set<string> = new Set<string>();

  static reassignToRealizedThreads<T>(
    state: { +[threadID: string]: T },
    props: Props,
  ): ?{ [threadID: string]: T } {
    const newState: { [string]: T } = {};
    let updated = false;
    for (const threadID in state) {
      const newThreadID =
        props.pendingRealizedThreadIDs.get(threadID) ?? threadID;
      if (newThreadID !== threadID) {
        updated = true;
      }
      newState[newThreadID] = state[threadID];
    }
    return updated ? newState : null;
  }

  static getDerivedStateFromProps(props: Props, state: State): ?Partial<State> {
    const pendingUploads = InputStateContainer.reassignToRealizedThreads(
      state.pendingUploads,
      props,
    );
    const textCursorPositions = InputStateContainer.reassignToRealizedThreads(
      state.textCursorPositions,
      props,
    );

    if (!pendingUploads && !textCursorPositions) {
      return null;
    }

    const stateUpdate: Partial<WritableState> = {};
    if (pendingUploads) {
      stateUpdate.pendingUploads = pendingUploads;
    }
    if (textCursorPositions) {
      stateUpdate.textCursorPositions = textCursorPositions;
    }
    return stateUpdate;
  }

  static completedMessageIDs(state: State): Set<string> {
    const completed = new Map<string, boolean>();
    for (const threadID in state.pendingUploads) {
      const pendingUploads = state.pendingUploads[threadID];
      for (const localUploadID in pendingUploads) {
        const upload = pendingUploads[localUploadID];
        const { messageID, canBeSent, failed } = upload;
        if (!messageID || !messageID.startsWith(localIDPrefix)) {
          continue;
        }
        if (!canBeSent || failed) {
          completed.set(messageID, false);
          continue;
        }
        if (completed.get(messageID) === undefined) {
          completed.set(messageID, true);
        }
      }
    }
    const messageIDs = new Set<string>();
    for (const [messageID, isCompleted] of completed) {
      if (isCompleted) {
        messageIDs.add(messageID);
      }
    }
    return messageIDs;
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.viewerID !== prevProps.viewerID) {
      this.setState({ pendingUploads: {} });
      return;
    }

    const previouslyAssignedMessageIDs = new Set<string>();
    for (const threadID in prevState.pendingUploads) {
      const pendingUploads = prevState.pendingUploads[threadID];
      for (const localUploadID in pendingUploads) {
        const { messageID } = pendingUploads[localUploadID];
        if (messageID) {
          previouslyAssignedMessageIDs.add(messageID);
        }
      }
    }

    const newlyAssignedUploads = new Map<
      string,
      {
        +threadID: string,
        +shouldEncrypt: boolean,
        +uploads: PendingMultimediaUpload[],
      },
    >();
    for (const threadID in this.state.pendingUploads) {
      const pendingUploads = this.state.pendingUploads[threadID];
      for (const localUploadID in pendingUploads) {
        const upload = pendingUploads[localUploadID];
        const { messageID } = upload;
        if (
          !messageID ||
          !messageID.startsWith(localIDPrefix) ||
          previouslyAssignedMessageIDs.has(messageID)
        ) {
          continue;
        }
        const { shouldEncrypt } = upload;
        let assignedUploads = newlyAssignedUploads.get(messageID);
        if (!assignedUploads) {
          assignedUploads = { threadID, shouldEncrypt, uploads: [] };
          newlyAssignedUploads.set(messageID, assignedUploads);
        }
        if (shouldEncrypt !== assignedUploads.shouldEncrypt) {
          console.warn(
            `skipping upload ${localUploadID} ` +
              "because shouldEncrypt doesn't match",
          );
          continue;
        }
        assignedUploads.uploads.push(upload);
      }
    }

    const newMessageInfos = new Map<string, RawMultimediaMessageInfo>();
    for (const [messageID, assignedUploads] of newlyAssignedUploads) {
      const { uploads, threadID, shouldEncrypt } = assignedUploads;
      const creatorID = this.props.viewerID;
      invariant(creatorID, 'need viewer ID in order to send a message');
      const media = uploads.map(
        ({
          localID,
          serverID,
          uri,
          mediaType,
          dimensions,
          encryptionKey,
          thumbHash,
        }) => {
          // We can get into this state where dimensions are null if the user is
          // uploading a file type that the browser can't render. In that case
          // we fake the dimensions here while we wait for the server to tell us
          // the true dimensions.
          const shimmedDimensions = dimensions ?? { height: 0, width: 0 };
          invariant(
            mediaType === 'photo' || mediaType === 'encrypted_photo',
            "web InputStateContainer can't handle video",
          );
          if (
            mediaType !== 'encrypted_photo' &&
            mediaType !== 'encrypted_video'
          ) {
            return {
              id: serverID ? serverID : localID,
              uri,
              type: 'photo',
              dimensions: shimmedDimensions,
              thumbHash,
            };
          }
          invariant(
            encryptionKey,
            'encrypted media must have an encryption key',
          );
          return {
            id: serverID ? serverID : localID,
            blobURI: uri,
            type: 'encrypted_photo',
            encryptionKey,
            dimensions: shimmedDimensions,
            thumbHash,
          };
        },
      );
      const messageInfo = createMediaMessageInfo(
        {
          localID: messageID,
          threadID,
          creatorID,
          media,
        },
        { forceMultimediaMessageType: shouldEncrypt },
      );
      newMessageInfos.set(messageID, messageInfo);
    }

    const currentlyCompleted = InputStateContainer.completedMessageIDs(
      this.state,
    );
    const previouslyCompleted =
      InputStateContainer.completedMessageIDs(prevState);
    for (const messageID of currentlyCompleted) {
      if (previouslyCompleted.has(messageID)) {
        continue;
      }
      let rawMessageInfo = newMessageInfos.get(messageID);
      if (rawMessageInfo) {
        newMessageInfos.delete(messageID);
      } else {
        rawMessageInfo = this.getRawMultimediaMessageInfo(messageID);
      }
      void this.sendMultimediaMessage(rawMessageInfo);
    }

    for (const [, messageInfo] of newMessageInfos) {
      this.props.dispatch({
        type: createLocalMessageActionType,
        payload: messageInfo,
      });
    }
  }

  getRawMultimediaMessageInfo(
    localMessageID: string,
  ): RawMultimediaMessageInfo {
    const rawMessageInfo = this.props.messageStoreMessages[localMessageID];
    invariant(rawMessageInfo, `rawMessageInfo ${localMessageID} should exist`);
    invariant(
      rawMessageInfo.type === messageTypes.IMAGES ||
        rawMessageInfo.type === messageTypes.MULTIMEDIA,
      `rawMessageInfo ${localMessageID} should be multimedia`,
    );
    return rawMessageInfo;
  }

  // eslint-disable-next-line no-unused-vars
  shouldEncryptMedia(threadInfo: ThreadInfo): boolean {
    return true;
  }

  async sendMultimediaMessage(
    messageInfo: RawMultimediaMessageInfo,
  ): Promise<void> {
    if (!threadIsPending(messageInfo.threadID)) {
      void this.props.dispatchActionPromise(
        sendMultimediaMessageActionTypes,
        this.sendMultimediaMessageAction(messageInfo),
        undefined,
        messageInfo,
      );
      return;
    }

    this.props.dispatch({
      type: sendMultimediaMessageActionTypes.started,
      payload: messageInfo,
    });

    let newThreadID = null;
    try {
      const threadCreationPromise = this.pendingThreadCreations.get(
        messageInfo.threadID,
      );
      if (!threadCreationPromise) {
        // When we create or retry multimedia message, we add a promise to
        // pendingThreadCreations map. This promise can be removed in
        // sendMultimediaMessage and sendTextMessage methods. When any of these
        // method remove the promise, it has to be settled. If the promise was
        // fulfilled, this method would be called with realized thread, so we
        // can conclude that the promise was rejected. We don't have enough info
        // here to retry the thread creation, but we can mark the message as
        // failed. Then the retry will be possible and promise will be created
        // again.
        throw new Error('Thread creation failed');
      }
      const result = await threadCreationPromise;
      newThreadID = result.threadID;
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      const payload = new SendMessageError(
        `Exception when creating thread: ${exceptionMessage}`,
        messageInfo.localID ?? '',
        messageInfo.threadID,
      );
      this.props.dispatch({
        type: sendMultimediaMessageActionTypes.failed,
        payload,
        error: true,
      });
      return;
    } finally {
      this.pendingThreadCreations.delete(messageInfo.threadID);
    }

    // While the thread was being created, the image preload may have completed,
    // and we might have a finalized URI now. So we fetch from Redux again
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should exist for locally-created RawMessageInfo',
    );
    const latestMessageInfo = this.getRawMultimediaMessageInfo(localID);

    // Conditional is necessary for Flow
    let newMessageInfo;
    if (latestMessageInfo.type === messageTypes.MULTIMEDIA) {
      newMessageInfo = {
        ...latestMessageInfo,
        threadID: newThreadID,
        time: Date.now(),
      };
    } else {
      newMessageInfo = {
        ...latestMessageInfo,
        threadID: newThreadID,
        time: Date.now(),
      };
    }

    void this.props.dispatchActionPromise(
      sendMultimediaMessageActionTypes,
      this.sendMultimediaMessageAction(newMessageInfo),
      undefined,
      newMessageInfo,
    );
  }

  async sendMultimediaMessageAction(
    messageInfo: RawMultimediaMessageInfo,
  ): Promise<SendMessagePayload> {
    const { localID, threadID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );
    const sidebarCreation =
      this.pendingSidebarCreationMessageLocalIDs.has(localID);
    try {
      const { result, mediaIDUpdates } = await this.props.sendMultimediaMessage(
        messageInfo,
        sidebarCreation,
        true,
      );
      this.pendingSidebarCreationMessageLocalIDs.delete(localID);
      this.setState(prevState => {
        const newThreadID = this.getRealizedOrPendingThreadID(threadID);
        const prevUploads = prevState.pendingUploads[newThreadID];
        const newUploads: { [string]: PendingMultimediaUpload } = {};
        for (const localUploadID in prevUploads) {
          const upload = prevUploads[localUploadID];
          if (upload.messageID !== localID) {
            newUploads[localUploadID] = upload;
          } else if (!upload.uriIsReal) {
            const { serverID } = upload;
            let newServerID = serverID;
            if (serverID && mediaIDUpdates?.[serverID]) {
              newServerID = mediaIDUpdates[serverID].id;
            }
            newUploads[localUploadID] = {
              ...upload,
              messageID: result.serverID,
              serverID: newServerID,
            };
          }
        }
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [newThreadID]: newUploads,
          },
        };
      });
      return result;
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      throw new SendMessageError(
        `Exception while sending multimedia message: ${exceptionMessage}`,
        localID,
        threadID,
      );
    }
  }

  startThreadCreation(threadInfo: ThreadInfo): Promise<{
    +threadID: string,
    +threadType: ThreadType,
  }> {
    if (!threadIsPending(threadInfo.id)) {
      return Promise.resolve({
        threadID: threadInfo.id,
        threadType: threadInfo.type,
      });
    }
    let threadCreationPromise = this.pendingThreadCreations.get(threadInfo.id);
    if (!threadCreationPromise) {
      const calendarQuery = this.props.calendarQuery();
      threadCreationPromise = createRealThreadFromPendingThread({
        threadInfo,
        dispatchActionPromise: this.props.dispatchActionPromise,
        createNewThinThread: this.props.newThinThread,
        createNewThickThread: this.props.newThickThread,
        sourceMessageID: threadInfo.sourceMessageID,
        viewerID: this.props.viewerID,
        calendarQuery,
      });
      this.pendingThreadCreations.set(threadInfo.id, threadCreationPromise);
    }
    return threadCreationPromise;
  }

  inputBaseStateSelector: (?string) => PropsAndState => BaseInputState =
    _memoize(threadID =>
      createSelector(
        (propsAndState: PropsAndState) =>
          threadID ? propsAndState.pendingUploads[threadID] : null,
        (propsAndState: PropsAndState) =>
          threadID
            ? propsAndState.drafts[draftKeyFromThreadID(threadID)]
            : null,
        (propsAndState: PropsAndState) =>
          threadID ? propsAndState.textCursorPositions[threadID] : null,
        (
          pendingUploads: ?{ [localUploadID: string]: PendingMultimediaUpload },
          draft: ?string,
          textCursorPosition: ?number,
        ) => {
          let threadPendingUploads: $ReadOnlyArray<PendingMultimediaUpload> =
            [];
          const assignedUploads: {
            [string]: $ReadOnlyArray<PendingMultimediaUpload>,
          } = {};
          if (pendingUploads) {
            const [uploadsWithMessageIDs, uploadsWithoutMessageIDs] =
              _partition('messageID')(pendingUploads);
            threadPendingUploads = _sortBy('localID')(uploadsWithoutMessageIDs);
            const threadAssignedUploads = _groupBy('messageID')(
              uploadsWithMessageIDs,
            );
            for (const messageID in threadAssignedUploads) {
              // lodash libdefs don't return $ReadOnlyArray
              assignedUploads[messageID] = [
                ...threadAssignedUploads[messageID],
              ];
            }
          }
          return ({
            pendingUploads: threadPendingUploads,
            assignedUploads,
            draft: draft ?? '',
            textCursorPosition: textCursorPosition ?? 0,
            appendFiles: (
              threadInfo: ThreadInfo,
              files: $ReadOnlyArray<File>,
            ) => this.appendFiles(threadInfo, files),
            cancelPendingUpload: this.cancelPendingUpload,
            sendTextMessage: (
              messageInfo: RawTextMessageInfo,
              threadInfo: ThreadInfo,
              parentThreadInfo: ?ThreadInfo,
            ) =>
              this.sendTextMessage(messageInfo, threadInfo, parentThreadInfo),
            createMultimediaMessage: (threadInfo: ThreadInfo) =>
              this.createMultimediaMessage(threadInfo),
            setDraft: (newDraft: string) => this.setDraft(threadID, newDraft),
            setTextCursorPosition: (newPosition: number) =>
              this.setTextCursorPosition(threadID, newPosition),
            messageHasUploadFailure: (localMessageID: string) =>
              this.messageHasUploadFailure(assignedUploads[localMessageID]),
            retryMultimediaMessage: (
              localMessageID: string,
              threadInfo: ThreadInfo,
            ) =>
              this.retryMultimediaMessage(
                localMessageID,
                threadInfo,
                assignedUploads[localMessageID],
              ),
            addReply: (message: string) => this.addReply(message),
            addReplyListener: this.addReplyListener,
            removeReplyListener: this.removeReplyListener,
            registerSendCallback: this.props.registerSendCallback,
            unregisterSendCallback: this.props.unregisterSendCallback,
          }: BaseInputState);
        },
      ),
    );

  typeaheadStateSelector: PropsAndState => TypeaheadInputState = createSelector(
    (propsAndState: PropsAndState) => propsAndState.typeaheadState,
    (typeaheadState: TypeaheadState) => ({
      typeaheadState,
      setTypeaheadState: this.setTypeaheadState,
    }),
  );

  inputStateSelector: CombinedInputState => InputState = createSelector(
    (state: CombinedInputState) => state.inputBaseState,
    (state: CombinedInputState) => state.typeaheadState,
    (inputBaseState: BaseInputState, typeaheadState: TypeaheadInputState) => ({
      ...inputBaseState,
      ...typeaheadState,
    }),
  );

  getRealizedOrPendingThreadID(threadID: string): string {
    return this.props.pendingRealizedThreadIDs.get(threadID) ?? threadID;
  }

  async appendFiles(
    threadInfo: ThreadInfo,
    files: $ReadOnlyArray<File>,
  ): Promise<boolean> {
    const selectionTime = Date.now();
    const { pushModal } = this.props;

    const appendResults = await Promise.all(
      files.map(file => this.appendFile(threadInfo, file, selectionTime)),
    );

    if (appendResults.some(({ result }) => !result.success)) {
      pushModal(<InvalidUploadModal />);

      const time = Date.now() - selectionTime;
      const reports = [];
      for (const appendResult of appendResults) {
        const { steps } = appendResult;
        let { result } = appendResult;
        let uploadLocalID;
        if (result.success) {
          uploadLocalID = result.pendingUpload.localID;
          result = { success: false, reason: 'web_sibling_validation_failed' };
        }
        const mediaMission = { steps, result, userTime: time, totalTime: time };
        reports.push({ mediaMission, uploadLocalID });
      }
      this.queueMediaMissionReports(reports);

      return false;
    }

    const newUploads = appendResults.map(({ result }) => {
      invariant(result.success, 'any failed validation should be caught above');
      return result.pendingUpload;
    });

    const newUploadsObject = _keyBy('localID')(newUploads);
    this.setState(
      prevState => {
        const newThreadID = this.getRealizedOrPendingThreadID(threadInfo.id);
        const prevUploads = prevState.pendingUploads[newThreadID];
        const mergedUploads = prevUploads
          ? { ...prevUploads, ...newUploadsObject }
          : newUploadsObject;
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [newThreadID]: mergedUploads,
          },
        };
      },
      () => this.uploadFiles(threadInfo, newUploads),
    );
    return true;
  }

  async appendFile(
    threadInfo: ThreadInfo,
    file: File,
    selectTime: number,
  ): Promise<{
    steps: $ReadOnlyArray<MediaMissionStep>,
    result:
      | MediaMissionFailure
      | { success: true, pendingUpload: PendingMultimediaUpload },
  }> {
    const steps: MediaMissionStep[] = [
      {
        step: 'web_selection',
        filename: file.name,
        size: file.size,
        mime: file.type,
        selectTime,
      },
    ];

    let response;
    const validationStart = Date.now();
    try {
      response = await validateFile(file);
    } catch (e) {
      return {
        steps,
        result: {
          success: false,
          reason: 'processing_exception',
          time: Date.now() - validationStart,
          exceptionMessage: getMessageForException(e),
        },
      };
    }
    const { steps: validationSteps, result } = response;
    steps.push(...validationSteps);
    if (!result.success) {
      return { steps, result };
    }
    const { uri, file: fixedFile, mediaType, dimensions } = result;

    const shouldEncrypt = this.shouldEncryptMedia(threadInfo);

    let encryptionResult;
    if (shouldEncrypt) {
      let encryptionResponse;
      const encryptionStart = Date.now();
      try {
        encryptionResponse = await encryptFile(fixedFile);
      } catch (e) {
        return {
          steps,
          result: {
            success: false,
            reason: 'encryption_exception',
            time: Date.now() - encryptionStart,
            exceptionMessage: getMessageForException(e),
          },
        };
      }
      steps.push(...encryptionResponse.steps);
      encryptionResult = encryptionResponse.result;
    }
    if (encryptionResult && !encryptionResult.success) {
      return { steps, result: encryptionResult };
    }

    const { steps: thumbHashSteps, result: thumbHashResult } =
      await generateThumbHash(fixedFile, encryptionResult?.encryptionKey);
    const thumbHash = thumbHashResult.success
      ? thumbHashResult.thumbHash
      : null;
    steps.push(...thumbHashSteps);

    return {
      steps,
      result: {
        success: true,
        pendingUpload: {
          localID: getNextLocalUploadID(),
          serverID: null,
          messageID: null,
          failed: false,
          file: encryptionResult?.file ?? fixedFile,
          mediaType: encryptionResult ? 'encrypted_photo' : mediaType,
          dimensions,
          uri: encryptionResult?.uri ?? uri,
          loop: false,
          uriIsReal: false,
          canBeSent: false,
          blobHolder: null,
          blobHash: encryptionResult?.sha256Hash,
          encryptionKey: encryptionResult?.encryptionKey,
          thumbHash,
          progressPercent: 0,
          abort: null,
          steps,
          selectTime,
          shouldEncrypt,
        },
      },
    };
  }

  uploadFiles(
    threadInfo: ThreadInfo,
    uploads: $ReadOnlyArray<PendingMultimediaUpload>,
  ): Promise<mixed> {
    return Promise.all(
      uploads.map(upload => this.uploadFile(threadInfo, upload)),
    );
  }

  async uploadFile(threadInfo: ThreadInfo, upload: PendingMultimediaUpload) {
    const { selectTime, localID, encryptionKey } = upload;
    const threadID = threadInfo.id;
    const isThickThread = threadTypeIsThick(threadInfo.type);
    const isEncrypted =
      !!encryptionKey &&
      (upload.mediaType === 'encrypted_photo' ||
        upload.mediaType === 'encrypted_video');

    const steps = [...upload.steps];
    let userTime;

    const { identityContext } = this.props;
    invariant(identityContext, 'Identity context should be set');

    const sendReport = (missionResult: MediaMissionResult) => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadID);
      const latestUpload = this.state.pendingUploads[newThreadID][localID];
      invariant(
        latestUpload,
        `pendingUpload ${localID} for ${newThreadID} missing in sendReport`,
      );
      const { serverID, messageID } = latestUpload;
      const totalTime = Date.now() - selectTime;
      userTime = userTime ? userTime : totalTime;
      const mission = { steps, result: missionResult, totalTime, userTime };
      this.queueMediaMissionReports([
        {
          mediaMission: mission,
          uploadLocalID: localID,
          uploadServerID: serverID,
          messageLocalID: messageID,
        },
      ]);
    };

    let uploadResult, uploadExceptionMessage;
    const uploadStart = Date.now();
    try {
      const callbacks = {
        onProgress: (percent: number) =>
          this.setProgress(threadID, localID, percent),
        abortHandler: (abort: () => void) =>
          this.handleAbortCallback(threadID, localID, abort),
      };
      const useBlobService = isThickThread || this.useBlobServiceUploads;
      if (
        useBlobService &&
        (upload.mediaType === 'encrypted_photo' ||
          upload.mediaType === 'encrypted_video')
      ) {
        const { blobHash, dimensions, thumbHash } = upload;
        invariant(
          encryptionKey && blobHash && dimensions,
          'incomplete encrypted upload',
        );

        uploadResult = await this.props.blobServiceUpload({
          uploadInput: {
            blobInput: {
              type: 'file',
              file: upload.file,
            },
            blobHash,
            encryptionKey,
            dimensions,
            loop: false,
            thumbHash,
          },
          keyserverOrThreadID: isThickThread ? null : threadID,
          callbacks,
        });
      } else {
        let uploadExtras = {
          ...upload.dimensions,
          loop: false,
          thumbHash: upload.thumbHash,
        };
        if (encryptionKey) {
          uploadExtras = { ...uploadExtras, encryptionKey };
        }
        uploadResult = await this.props.uploadMultimedia(
          upload.file,
          uploadExtras,
          callbacks,
        );
      }
    } catch (e) {
      uploadExceptionMessage = getMessageForException(e);
      this.handleUploadFailure(threadID, localID);
    }
    userTime = Date.now() - selectTime;
    steps.push({
      step: 'upload',
      success: !!uploadResult,
      exceptionMessage: uploadExceptionMessage,
      time: Date.now() - uploadStart,
      inputFilename: upload.file.name,
      outputMediaType: uploadResult && uploadResult.mediaType,
      outputURI: uploadResult && uploadResult.uri,
      outputDimensions: uploadResult && uploadResult.dimensions,
      outputLoop: uploadResult && uploadResult.loop,
    });
    if (!uploadResult) {
      sendReport({
        success: false,
        reason: 'http_upload_failed',
        exceptionMessage: uploadExceptionMessage,
      });
      return;
    }
    const result = uploadResult;
    const outputMediaType = isEncrypted ? 'encrypted_photo' : result.mediaType;

    const successThreadID = this.getRealizedOrPendingThreadID(threadID);
    const uploadAfterSuccess =
      this.state.pendingUploads[successThreadID][localID];
    invariant(
      uploadAfterSuccess,
      `pendingUpload ${localID}/${result.id} for ${successThreadID} missing ` +
        `after upload`,
    );
    if (uploadAfterSuccess.messageID) {
      this.props.dispatch({
        type: updateMultimediaMessageMediaActionType,
        payload: {
          messageID: uploadAfterSuccess.messageID,
          currentMediaID: localID,
          mediaUpdate: {
            id: result.id,
          },
        },
      });
    }

    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadID);
      const uploads = prevState.pendingUploads[newThreadID];
      const currentUpload = uploads[localID];
      invariant(
        currentUpload,
        `pendingUpload ${localID}/${result.id} for ${newThreadID} ` +
          `missing while assigning serverID`,
      );
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [newThreadID]: {
            ...uploads,
            [localID]: {
              ...currentUpload,
              serverID: result.id,
              blobHolder: result.blobHolder,
              abort: null,
              // For thin threads we can send message right after serverID
              // is present, but for thick threads we need to wait until
              // a "real" Blob URI is assigned to the message.
              canBeSent: !isThickThread,
            },
          },
        },
      };
    });

    if (encryptionKey) {
      const authMetadata = await identityContext.getAuthMetadata();
      const { steps: preloadSteps } = await preloadMediaResource(
        result.uri,
        authMetadata,
      );
      steps.push(...preloadSteps);
    } else {
      const { steps: preloadSteps } = await preloadImage(result.uri);
      steps.push(...preloadSteps);
    }
    sendReport({ success: true });

    const preloadThreadID = this.getRealizedOrPendingThreadID(threadID);
    const uploadAfterPreload =
      this.state.pendingUploads[preloadThreadID][localID];
    invariant(
      uploadAfterPreload,
      `pendingUpload ${localID}/${result.id} for ${preloadThreadID} missing ` +
        `after preload`,
    );
    if (uploadAfterPreload.messageID) {
      const { mediaType, uri, dimensions } = result;
      const { thumbHash } = upload;
      let mediaUpdate = {
        dimensions,
        ...(thumbHash ? { thumbHash } : undefined),
      };
      if (!isEncrypted) {
        mediaUpdate = {
          ...mediaUpdate,
          type: mediaType,
          uri,
        };
      } else {
        mediaUpdate = {
          ...mediaUpdate,
          type: outputMediaType,
          blobURI: uri,
          encryptionKey,
        };
      }
      this.props.dispatch({
        type: updateMultimediaMessageMediaActionType,
        payload: {
          messageID: uploadAfterPreload.messageID,
          currentMediaID: result.id ?? uploadAfterPreload.localID,
          mediaUpdate,
        },
      });
    }

    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadID);
      const uploads = prevState.pendingUploads[newThreadID];
      const currentUpload = uploads[localID];
      invariant(
        currentUpload,
        `pendingUpload ${localID}/${result.id} for ${newThreadID} ` +
          `missing while assigning URI`,
      );
      const { messageID } = currentUpload;
      if (messageID && !messageID.startsWith(localIDPrefix)) {
        const newPendingUploads = _omit([localID])(uploads);
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [newThreadID]: newPendingUploads,
          },
        };
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [newThreadID]: {
            ...uploads,
            [localID]: {
              ...currentUpload,
              uri: result.uri,
              mediaType: outputMediaType,
              dimensions: result.dimensions,
              loop: result.loop,
              uriIsReal: true,
              canBeSent: true,
            },
          },
        },
      };
    });
  }

  handleAbortCallback(
    threadID: string,
    localUploadID: string,
    abort: () => void,
  ) {
    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadID);
      const uploads = prevState.pendingUploads[newThreadID];
      const upload = uploads[localUploadID];
      if (!upload) {
        // The upload has been cancelled before we were even handed the
        // abort function. We should immediately abort.
        abort();
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [newThreadID]: {
            ...uploads,
            [localUploadID]: {
              ...upload,
              abort,
            },
          },
        },
      };
    });
  }

  handleUploadFailure(threadID: string, localUploadID: string) {
    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadID);
      const uploads = prevState.pendingUploads[newThreadID];
      const upload = uploads[localUploadID];
      if (!upload || !upload.abort || upload.serverID) {
        // The upload has been cancelled or completed before it failed
        return {};
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [newThreadID]: {
            ...uploads,
            [localUploadID]: {
              ...upload,
              failed: true,
              progressPercent: 0,
              abort: null,
            },
          },
        },
      };
    });
  }

  queueMediaMissionReports(
    partials: $ReadOnlyArray<{
      mediaMission: MediaMission,
      uploadLocalID?: ?string,
      uploadServerID?: ?string,
      messageLocalID?: ?string,
    }>,
  ) {
    const reports = partials.map(
      ({ mediaMission, uploadLocalID, uploadServerID, messageLocalID }) => ({
        type: reportTypes.MEDIA_MISSION,
        time: Date.now(),
        platformDetails: getConfig().platformDetails,
        mediaMission,
        uploadServerID,
        uploadLocalID,
        messageLocalID,
        id: generateReportID(),
      }),
    );
    this.props.dispatch({ type: queueReportsActionType, payload: { reports } });
  }

  cancelPendingUpload = (threadInfo: ThreadInfo, localUploadID: string) => {
    let revokeURL: ?string, abortRequest: ?() => void;
    this.setState(
      prevState => {
        const newThreadID = this.getRealizedOrPendingThreadID(threadInfo.id);
        const currentPendingUploads = prevState.pendingUploads[newThreadID];
        if (!currentPendingUploads) {
          return {};
        }
        const pendingUpload = currentPendingUploads[localUploadID];
        if (!pendingUpload) {
          return {};
        }
        if (!pendingUpload.uriIsReal) {
          revokeURL = pendingUpload.uri;
        }
        if (pendingUpload.abort) {
          abortRequest = pendingUpload.abort;
        }
        if (pendingUpload.serverID) {
          const { serverID } = pendingUpload;
          if (!threadTypeIsThick(threadInfo.type)) {
            void this.props.deleteUpload({
              id: serverID,
              keyserverOrThreadID: threadInfo.id,
            });
          }
          if (isBlobServiceURI(pendingUpload.uri)) {
            const identityContext = this.props.identityContext;
            invariant(identityContext, 'Identity context should be set');
            invariant(
              pendingUpload.blobHolder,
              'blob service upload has no holder',
            );
            const endpoint = blobService.httpEndpoints.DELETE_BLOB;
            const holder = pendingUpload.blobHolder;
            const blobHash = blobHashFromBlobServiceURI(pendingUpload.uri);
            void (async () => {
              const authMetadata = await identityContext.getAuthMetadata();
              const defaultHeaders =
                createDefaultHTTPRequestHeaders(authMetadata);
              await fetch(makeBlobServiceEndpointURL(endpoint), {
                method: endpoint.method,
                body: JSON.stringify({
                  holder,
                  blob_hash: blobHash,
                }),
                headers: {
                  ...defaultHeaders,
                  'content-type': 'application/json',
                },
              });
            })();
          }
        }
        const newPendingUploads = _omit([localUploadID])(currentPendingUploads);
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [newThreadID]: newPendingUploads,
          },
        };
      },
      () => {
        if (revokeURL) {
          URL.revokeObjectURL(revokeURL);
        }
        if (abortRequest) {
          abortRequest();
        }
      },
    );
  };

  async sendTextMessage(
    messageInfo: RawTextMessageInfo,
    inputThreadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ) {
    this.props.sendCallbacks.forEach(callback => callback());

    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );
    if (threadIsPendingSidebar(inputThreadInfo.id)) {
      this.pendingSidebarCreationMessageLocalIDs.add(localID);
    }

    if (!threadIsPending(inputThreadInfo.id)) {
      void this.props.dispatchActionPromise(
        sendTextMessageActionTypes,
        this.sendTextMessageAction(
          messageInfo,
          inputThreadInfo,
          parentThreadInfo,
        ),
        undefined,
        messageInfo,
      );
      return;
    }

    this.props.dispatch({
      type: sendTextMessageActionTypes.started,
      payload: messageInfo,
    });

    let threadInfo = inputThreadInfo;
    const { viewerID } = this.props;
    if (viewerID && threadTypeIsSidebar(inputThreadInfo.type)) {
      invariant(parentThreadInfo, 'sidebar should have parent');
      threadInfo = patchThreadInfoToIncludeMentionedMembersOfParent(
        inputThreadInfo,
        parentThreadInfo,
        messageInfo.text,
        viewerID,
      );
      if (threadInfo !== inputThreadInfo) {
        this.props.dispatch({
          type: updateNavInfoActionType,
          payload: { pendingThread: threadInfo },
        });
      }
    }

    let threadCreationResult = null;
    try {
      threadCreationResult = await this.startThreadCreation(threadInfo);
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      const payload = new SendMessageError(
        `Exception while creating thread: ${exceptionMessage}`,
        messageInfo.localID ?? '',
        messageInfo.threadID,
      );
      this.props.dispatch({
        type: sendTextMessageActionTypes.failed,
        payload,
        error: true,
      });
      return;
    } finally {
      this.pendingThreadCreations.delete(threadInfo.id);
    }

    const newMessageInfo = {
      ...messageInfo,
      threadID: threadCreationResult?.threadID,
      time: Date.now(),
    };

    const newThreadInfo = {
      ...threadInfo,
      id: threadCreationResult?.threadID,
      type: threadCreationResult?.threadType ?? threadInfo.type,
    };
    void this.props.dispatchActionPromise(
      sendTextMessageActionTypes,
      this.sendTextMessageAction(
        newMessageInfo,
        newThreadInfo,
        parentThreadInfo,
      ),
      undefined,
      newMessageInfo,
    );
  }

  async sendTextMessageAction(
    messageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ): Promise<SendMessagePayload> {
    try {
      if (!threadTypeIsThick(threadInfo.type)) {
        await this.props.textMessageCreationSideEffectsFunc(
          messageInfo,
          threadInfo,
          parentThreadInfo,
        );
      }
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      const sidebarCreation =
        this.pendingSidebarCreationMessageLocalIDs.has(localID);
      const result = await this.props.sendTextMessage(
        messageInfo,
        threadInfo,
        parentThreadInfo,
        sidebarCreation,
      );
      if (threadTypeIsThick(threadInfo.type)) {
        await this.props.textMessageCreationSideEffectsFunc(
          messageInfo,
          threadInfo,
          parentThreadInfo,
        );
      }
      this.pendingSidebarCreationMessageLocalIDs.delete(localID);
      return result;
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      throw new SendMessageError(
        `Exception while sending text message: ${exceptionMessage}`,
        messageInfo.localID ?? '',
        messageInfo.threadID,
      );
    }
  }

  // Creates a MultimediaMessage from the unassigned pending uploads,
  // if there are any
  createMultimediaMessage(threadInfo: ThreadInfo) {
    this.props.sendCallbacks.forEach(callback => callback());

    const localMessageID = getNextLocalID();
    void this.startThreadCreation(threadInfo);

    if (threadIsPendingSidebar(threadInfo.id)) {
      this.pendingSidebarCreationMessageLocalIDs.add(localMessageID);
    }

    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadInfo.id);
      const currentPendingUploads = prevState.pendingUploads[newThreadID];
      if (!currentPendingUploads) {
        return {};
      }
      const newPendingUploads: { [string]: PendingMultimediaUpload } = {};
      let uploadAssigned = false;
      for (const localUploadID in currentPendingUploads) {
        const upload = currentPendingUploads[localUploadID];
        if (upload.messageID) {
          newPendingUploads[localUploadID] = upload;
        } else {
          const newUpload = {
            ...upload,
            messageID: localMessageID,
          };
          uploadAssigned = true;
          newPendingUploads[localUploadID] = newUpload;
        }
      }
      if (!uploadAssigned) {
        return {};
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [newThreadID]: newPendingUploads,
        },
      };
    });
  }

  setDraft(threadID: ?string, draft: string) {
    invariant(threadID, 'threadID should be set in setDraft');

    const newThreadID = this.getRealizedOrPendingThreadID(threadID);
    this.props.dispatch({
      type: 'UPDATE_DRAFT',
      payload: {
        key: draftKeyFromThreadID(newThreadID),
        text: draft,
      },
    });
  }

  setTextCursorPosition(threadID: ?string, newPosition: number) {
    invariant(threadID, 'threadID should be set in setTextCursorPosition');

    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadID);
      return {
        textCursorPositions: {
          ...prevState.textCursorPositions,
          [newThreadID]: newPosition,
        },
      };
    });
  }

  setTypeaheadState = (newState: Partial<TypeaheadState>) => {
    this.setState(prevState => ({
      typeaheadState: {
        ...prevState.typeaheadState,
        ...newState,
      },
    }));
  };

  setProgress(
    threadID: string,
    localUploadID: string,
    progressPercent: number,
  ) {
    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadID);
      const pendingUploads = prevState.pendingUploads[newThreadID];
      if (!pendingUploads) {
        return {};
      }
      const pendingUpload = pendingUploads[localUploadID];
      if (!pendingUpload) {
        return {};
      }
      const newPendingUploads = {
        ...pendingUploads,
        [localUploadID]: {
          ...pendingUpload,
          progressPercent,
        },
      };
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [newThreadID]: newPendingUploads,
        },
      };
    });
  }

  messageHasUploadFailure(
    pendingUploads: ?$ReadOnlyArray<PendingMultimediaUpload>,
  ): boolean {
    if (!pendingUploads) {
      return false;
    }
    return pendingUploads.some(upload => upload.failed);
  }

  retryMultimediaMessage(
    localMessageID: string,
    threadInfo: ThreadInfo,
    pendingUploads: ?$ReadOnlyArray<PendingMultimediaUpload>,
  ) {
    this.props.sendCallbacks.forEach(callback => callback());

    const rawMessageInfo = this.getRawMultimediaMessageInfo(localMessageID);
    let newRawMessageInfo;
    // This conditional is for Flow
    if (rawMessageInfo.type === messageTypes.MULTIMEDIA) {
      newRawMessageInfo = ({
        ...rawMessageInfo,
        time: Date.now(),
      }: RawMediaMessageInfo);
    } else {
      newRawMessageInfo = ({
        ...rawMessageInfo,
        time: Date.now(),
      }: RawImagesMessageInfo);
    }

    void this.startThreadCreation(threadInfo);

    if (threadIsPendingSidebar(threadInfo.id)) {
      this.pendingSidebarCreationMessageLocalIDs.add(localMessageID);
    }

    const completed = InputStateContainer.completedMessageIDs(this.state);
    if (completed.has(localMessageID)) {
      void this.sendMultimediaMessage(newRawMessageInfo);
      return;
    }

    if (!pendingUploads) {
      return;
    }

    // We're not actually starting the send here,
    // we just use this action to update the message's timestamp in Redux
    this.props.dispatch({
      type: sendMultimediaMessageActionTypes.started,
      payload: newRawMessageInfo,
    });

    const uploadIDsToRetry = new Set<string>();
    const uploadsToRetry = [];
    for (const pendingUpload of pendingUploads) {
      const { serverID, messageID, localID, abort } = pendingUpload;
      if (serverID || messageID !== localMessageID) {
        continue;
      }
      if (abort) {
        abort();
      }
      uploadIDsToRetry.add(localID);
      uploadsToRetry.push(pendingUpload);
    }

    this.setState(prevState => {
      const newThreadID = this.getRealizedOrPendingThreadID(threadInfo.id);
      const prevPendingUploads = prevState.pendingUploads[newThreadID];
      if (!prevPendingUploads) {
        return {};
      }
      const newPendingUploads: { [string]: PendingMultimediaUpload } = {};
      let pendingUploadChanged = false;
      for (const localID in prevPendingUploads) {
        const pendingUpload = prevPendingUploads[localID];
        if (uploadIDsToRetry.has(localID) && !pendingUpload.serverID) {
          newPendingUploads[localID] = {
            ...pendingUpload,
            failed: false,
            progressPercent: 0,
            abort: null,
          };
          pendingUploadChanged = true;
        } else {
          newPendingUploads[localID] = pendingUpload;
        }
      }
      if (!pendingUploadChanged) {
        return {};
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [newThreadID]: newPendingUploads,
        },
      };
    });

    void this.uploadFiles(threadInfo, uploadsToRetry);
  }

  addReply = (message: string) => {
    this.replyCallbacks.forEach(addReplyCallback => addReplyCallback(message));
  };

  addReplyListener = (callbackReply: (message: string) => void) => {
    this.replyCallbacks.push(callbackReply);
  };

  removeReplyListener = (callbackReply: (message: string) => void) => {
    this.replyCallbacks = this.replyCallbacks.filter(
      candidate => candidate !== callbackReply,
    );
  };

  render(): React.Node {
    const { activeChatThreadID } = this.props;

    // we're going with two selectors as we want to avoid
    // recreation of chat state setter functions on typeahead state updates
    const inputBaseState = this.inputBaseStateSelector(activeChatThreadID)({
      ...this.state,
      ...this.props,
    });

    const typeaheadState = this.typeaheadStateSelector({
      ...this.state,
      ...this.props,
    });

    const inputState = this.inputStateSelector({
      inputBaseState,
      typeaheadState,
    });

    return (
      <InputStateContext.Provider value={inputState}>
        {this.props.children}
      </InputStateContext.Provider>
    );
  }
}

const ConnectedInputStateContainer: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedInputStateContainer(props) {
    const activeChatThreadID = useSelector(
      state => state.navInfo.activeChatThreadID,
    );
    const drafts = useSelector(state => state.draftStore.drafts);
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const messageStoreMessages = useSelector(
      state => state.messageStore.messages,
    );
    const pendingToRealizedThreadIDs = useSelector(state =>
      pendingToRealizedThreadIDsSelector(state.threadStore.threadInfos),
    );
    const calendarQuery = useSelector(nonThreadCalendarQuery);
    const callUploadMultimedia = useLegacyAshoatKeyserverCall(uploadMultimedia);
    const callBlobServiceUpload = useBlobServiceUpload();
    const callDeleteUpload = useDeleteUpload();
    const callSendMultimediaMessage =
      useInputStateContainerSendMultimediaMessage();
    const callSendTextMessage = useInputStateContainerSendTextMessage();
    const callNewThinThread = useNewThinThread();
    const callNewThickThread = useNewThickThread();
    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const modalContext = useModalContext();
    const identityContext = React.useContext(IdentityClientContext);

    const [sendCallbacks, setSendCallbacks] = React.useState<
      $ReadOnlyArray<() => mixed>,
    >([]);
    const registerSendCallback = React.useCallback((callback: () => mixed) => {
      setSendCallbacks(prevCallbacks => [...prevCallbacks, callback]);
    }, []);
    const unregisterSendCallback = React.useCallback(
      (callback: () => mixed) => {
        setSendCallbacks(prevCallbacks =>
          prevCallbacks.filter(candidate => candidate !== callback),
        );
      },
      [],
    );
    const textMessageCreationSideEffectsFunc =
      useMessageCreationSideEffectsFunc<RawTextMessageInfo>(messageTypes.TEXT);

    return (
      <InputStateContainer
        {...props}
        activeChatThreadID={activeChatThreadID}
        drafts={drafts}
        viewerID={viewerID}
        messageStoreMessages={messageStoreMessages}
        pendingRealizedThreadIDs={pendingToRealizedThreadIDs}
        calendarQuery={calendarQuery}
        uploadMultimedia={callUploadMultimedia}
        blobServiceUpload={callBlobServiceUpload}
        deleteUpload={callDeleteUpload}
        sendMultimediaMessage={callSendMultimediaMessage}
        sendTextMessage={callSendTextMessage}
        newThinThread={callNewThinThread}
        newThickThread={callNewThickThread}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        pushModal={modalContext.pushModal}
        sendCallbacks={sendCallbacks}
        registerSendCallback={registerSendCallback}
        unregisterSendCallback={unregisterSendCallback}
        textMessageCreationSideEffectsFunc={textMessageCreationSideEffectsFunc}
        identityContext={identityContext}
      />
    );
  });

export default ConnectedInputStateContainer;

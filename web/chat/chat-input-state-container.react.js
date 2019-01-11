// @flow

import type { AppState } from '../redux-setup';
import type { UploadMultimediaResult } from 'lib/types/media-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { PendingMultimediaUpload } from './chat-input-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';
import _keyBy from 'lodash/fp/keyBy';
import _omit from 'lodash/fp/omit';
import _flow from 'lodash/fp/flow';
import _omitBy from 'lodash/fp/pickBy';
import _map from 'lodash/fp/map';
import _groupBy from 'lodash/fp/groupBy';
import _partition from 'lodash/fp/partition';
import _mapValues from 'lodash/fp/mapValues';

import { connect } from 'lib/utils/redux-utils';
import {
  uploadMultimedia,
  assignMediaServerIDToMessageActionType,
  assignMediaServerURIToMessageActionType,
  deleteUpload,
} from 'lib/actions/upload-actions';

import ChatMessageList from './chat-message-list.react';
import { validateFile, preloadImage } from '../utils/media-utils';

let nextLocalUploadID = 0;

type Props = {|
  // Redux state
  activeChatThreadID: ?string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  // async functions that hit server APIs
  uploadMultimedia: (
    multimedia: Object,
    onProgress: (percent: number) => void,
    abortHandler: (abort: () => void) => void,
  ) => Promise<UploadMultimediaResult>,
  deleteUpload: (id: string) => Promise<void>,
|};
type State = {|
  pendingUploads:
    {[threadID: string]: {[localUploadID: string]: PendingMultimediaUpload}},
  drafts: {[threadID: string]: string},
|};
class ChatInputStateContainer extends React.PureComponent<Props, State> {

  static propTypes = {
    activeChatThreadID: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
    uploadMultimedia: PropTypes.func.isRequired,
    deleteUpload: PropTypes.func.isRequired,
  };
  state = {
    pendingUploads: {},
    drafts: {},
  };

  chatInputStateSelector = _memoize((threadID: string) => createSelector(
    (state: State) => state.pendingUploads[threadID],
    (state: State) => state.drafts[threadID],
    (
      pendingUploads: ?{[localUploadID: string]: PendingMultimediaUpload},
      draft: ?string,
    ) => {
      let threadPendingUploads, threadAssignedUploads;
      if (!pendingUploads) {
        threadPendingUploads = [];
        threadAssignedUploads = {};
      } else {
        const [
          uploadsWithMessageIDs,
          uploadsWithoutMessageIDs,
        ] = _partition('messageID')(pendingUploads);
        threadPendingUploads = uploadsWithoutMessageIDs;
        threadAssignedUploads = _groupBy('messageID')(uploadsWithMessageIDs);
      }
      return {
        pendingUploads: threadPendingUploads,
        assignedUploads: threadAssignedUploads,
        draft: draft ? draft : "",
        appendFiles: (files: $ReadOnlyArray<File>) =>
          this.appendFiles(threadID, files),
        cancelPendingUpload: (localUploadID: string) =>
          this.cancelPendingUpload(threadID, localUploadID),
        assignPendingUploads: (localMessageID: string) =>
          this.assignPendingUploads(threadID, localMessageID),
        setDraft: (draft: string) => this.setDraft(threadID, draft),
        setProgress: (localUploadID: string, percent: number) =>
          this.setProgress(threadID, localUploadID, percent),
      };
    },
  ));

  async appendFiles(threadID: string, files: $ReadOnlyArray<File>) {
    const validationResult = await Promise.all(files.map(validateFile));
    const validatedFileInfo = validationResult.filter(Boolean);
    if (validatedFileInfo.length === 0) {
      return;
    }
    const newUploads = validatedFileInfo.map(({ file, mediaType }) => ({
      localID: `localUpload${nextLocalUploadID++}`,
      serverID: null,
      messageID: null,
      failed: null,
      file,
      mediaType,
      uri: URL.createObjectURL(file),
      uriIsReal: false,
      progressPercent: 0,
      abort: null,
    }));
    const newUploadsObject = _keyBy('localID')(newUploads);
    this.setState(
      prevState => {
        const prevUploads = prevState.pendingUploads[threadID];
        const mergedUploads = prevUploads
          ? { ...prevUploads, ...newUploadsObject }
          : newUploadsObject;
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [threadID]: mergedUploads,
          },
        };
      },
      () => this.uploadFiles(
        threadID,
        newUploads,
      ),
    );
  }

  uploadFiles(
    threadID: string,
    uploads: $ReadOnlyArray<PendingMultimediaUpload>,
  ) {
    return Promise.all(
      uploads.map(upload => this.uploadFile(threadID, upload)),
    );
  }

  async uploadFile(threadID: string, upload: PendingMultimediaUpload) {
    let result;
    try {
      result = await this.props.uploadMultimedia(
        upload.file,
        (percent: number) => this.setProgress(
          threadID,
          upload.localID,
          percent,
        ),
        (abort: () => void) => this.handleAbortCallback(
          threadID,
          upload.localID,
          abort,
        ),
      );
    } catch (e) {
      this.handleUploadFailure(
        threadID,
        upload.localID,
        e,
      );
      return;
    }

    const uploadAfterSuccess =
      this.state.pendingUploads[threadID][upload.localID];
    if (uploadAfterSuccess && uploadAfterSuccess.messageID) {
      this.props.dispatchActionPayload(
        assignMediaServerIDToMessageActionType,
        {
          messageID: uploadAfterSuccess.messageID,
          mediaLocalID: upload.localID,
          mediaServerID: result.id,
        },
      );
    }

    this.setState(prevState => {
      const uploads = prevState.pendingUploads[threadID];
      const currentUpload = uploads[upload.localID];
      if (!currentUpload) {
        return {};
      }
      let newUploads;
      if (currentUpload.messageID) {
        // If the messageID is already set, then there is no need to keep
        // tracking this upload. The above action dispatch should ensure no
        // pointers to this localID exist.
        newUploads = _omit([ upload.localID ])(uploads);
      } else {
        // Otherwise, the message hasn't been sent yet, so the uploads are still
        // pending. We'll mark the serverID in our local state.
        newUploads = {
          ...uploads,
          [upload.localID]: {
            ...currentUpload,
            serverID: result.id,
            abort: null,
          },
        };
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: newUploads,
        },
      };
    });

    await preloadImage(result.uri);

    const replaceURI = upload => this.props.dispatchActionPayload(
      assignMediaServerURIToMessageActionType,
      {
        messageID: uploadAfterPreload.messageID,
        mediaID: uploadAfterPreload.serverID
          ? uploadAfterPreload.serverID
          : uploadAfterPreload.localID,
        serverURI: result.uri,
      },
    );

    const uploadAfterPreload =
      this.state.pendingUploads[threadID][upload.localID];
    if (!uploadAfterPreload || uploadAfterPreload.messageID) {
      replaceURI(uploadAfterPreload);
    } else {
      this.setState(prevState => {
        const uploads = prevState.pendingUploads[threadID];
        const currentUpload = uploads[upload.localID];
        if (!currentUpload) {
          replaceURI(currentUpload);
          return {};
        }
        let newUploads;
        if (currentUpload.messageID) {
          // If the messageID is already set, then there is no need to keep
          // tracking this upload. The above action dispatch should ensure no
          // pointers to this localID exist.
          newUploads = _omit([ upload.localID ])(uploads);
          replaceURI(currentUpload);
        } else {
          // Otherwise, the message hasn't been sent yet, so the uploads are still
          // pending. We'll mark the serverID in our local state.
          newUploads = {
            ...uploads,
            [upload.localID]: {
              ...currentUpload,
              uri: result.uri,
              uriIsReal: true,
            },
          };
        }
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [threadID]: newUploads,
          },
        };
      });
    }
  }

  handleAbortCallback(
    threadID: string,
    localUploadID: string,
    abort: () => void,
  ) {
    this.setState(prevState => {
      const uploads = prevState.pendingUploads[threadID];
      const upload = uploads[localUploadID];
      if (!upload) {
        // The upload has been cancelled before we were even handed the
        // abort function. We should immediately abort.
        abort();
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: {
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

  handleUploadFailure(
    threadID: string,
    localUploadID: string,
    e: any,
  ) {
    const failed = e instanceof Error ? e.message : "failed";
    this.setState(prevState => {
      const uploads = prevState.pendingUploads[threadID];
      const upload = uploads[localUploadID];
      if (!upload) {
        // The upload has been cancelled before it failed
        return {};
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: {
            ...uploads,
            [localUploadID]: {
              ...upload,
              failed,
              progressPercent: 0,
              abort: null,
            },
          },
        },
      };
    });
  }

  cancelPendingUpload(threadID: string, localUploadID: string) {
    let revokeURL, abortRequest;
    this.setState(
      prevState => {
        const currentPendingUploads = prevState.pendingUploads[threadID];
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
          this.props.deleteUpload(pendingUpload.serverID);
        }
        const newPendingUploads = _omit([ localUploadID ])(currentPendingUploads);
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [threadID]: newPendingUploads,
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
  }

  assignPendingUploads(threadID: string, localMessageID: string) {
    this.setState(prevState => {
      const currentPendingUploads = prevState.pendingUploads[threadID];
      if (
        !currentPendingUploads ||
        Object.keys(currentPendingUploads).length === 0
      ) {
        return {};
      }
      const newPendingUploads = _flow(
        _omitBy('serverID'),
        _mapValues(
          (pendingUpload: PendingMultimediaUpload) => ({
            ...pendingUpload,
            messageID: localMessageID,
          }),
        ),
      )(currentPendingUploads);
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: newPendingUploads,
        },
      };
    });
  }

  setDraft(threadID: string, draft: string) {
    this.setState(prevState => ({
      drafts: {
        ...prevState.drafts,
        [threadID]: draft,
      },
    }));
  }

  setProgress(
    threadID: string,
    localUploadID: string,
    progressPercent: number,
  ) {
    this.setState(prevState => {
      const pendingUploads = prevState.pendingUploads[threadID];
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
          [threadID]: newPendingUploads,
        },
      };
    });
  }

  render() {
    const { activeChatThreadID } = this.props;
    const chatInputState = activeChatThreadID
      ? this.chatInputStateSelector(activeChatThreadID)(this.state)
      : null;
    return (
      <ChatMessageList
        activeChatThreadID={activeChatThreadID}
        chatInputState={chatInputState}
      />
    );
  }

}

export default connect(
  (state: AppState) => ({
    activeChatThreadID: state.navInfo.activeChatThreadID,
  }),
  { uploadMultimedia, deleteUpload },
)(ChatInputStateContainer);

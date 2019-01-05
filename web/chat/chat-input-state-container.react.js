// @flow

import type { AppState } from '../redux-setup';
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

import ChatMessageList from './chat-message-list.react';
import { validateFile } from '../utils/media-utils';

let nextLocalUploadID = 0;

type Props = {|
  // Redux state
  activeChatThreadID: ?string,
|};
type State = {|
  pendingUploads:
    {[threadID: string]: {[localUploadID: string]: PendingMultimediaUpload}},
  drafts: {[threadID: string]: string},
|};
class ChatInputStateContainer extends React.PureComponent<Props, State> {

  static propTypes = {
    activeChatThreadID: PropTypes.string,
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
    }));
    const newUploadsObject = _keyBy('localID')(newUploads);
    this.setState(prevState => {
      const prevUploads = prevState.pendingUploads[threadID];
      const mergedUploads = prevUploads
        ? { ...prevUploads, ...newUploadsObject }
        : newUploads;
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: mergedUploads,
        },
      };
    });
  }

  cancelPendingUpload(threadID: string, localUploadID: string) {
    let revokeURL;
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

export default connect((state: AppState) => ({
  activeChatThreadID: state.navInfo.activeChatThreadID,
}))(ChatInputStateContainer);

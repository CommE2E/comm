// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ThickThreadChanges } from 'lib/types/thread-types.js';

import {
  useOnSaveGeneralThreadSettings,
  useOnSavePrivacyThreadSettings,
} from './thread-settings-utils.js';
import Button from '../../../components/button.react.js';

type Props = {
  +activeTab: 'general' | 'privacy',
  +threadInfo: ThreadInfo,
  +queuedChanges: ThickThreadChanges,
  +setQueuedChanges: SetState<ThickThreadChanges>,
  +setErrorMessage: SetState<?string>,
  +threadSettingsOperationInProgress: boolean,
};

function ThreadSettingsSaveButton(props: Props): React.Node {
  const {
    activeTab,
    threadInfo,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
    threadSettingsOperationInProgress,
  } = props;

  const onSaveGeneralThreadSettings = useOnSaveGeneralThreadSettings({
    threadInfo,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
  });

  const onSavePrivacyThreadSettings = useOnSavePrivacyThreadSettings({
    threadInfo,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
  });

  const changeQueued: boolean = React.useMemo(
    () => Object.values(queuedChanges).some(v => v !== null && v !== undefined),
    [queuedChanges],
  );

  const threadSettingsSaveButton = React.useMemo(
    () => (
      <Button
        onClick={
          activeTab === 'general'
            ? onSaveGeneralThreadSettings
            : onSavePrivacyThreadSettings
        }
        disabled={threadSettingsOperationInProgress || !changeQueued}
        variant="filled"
      >
        Save
      </Button>
    ),
    [
      activeTab,
      changeQueued,
      onSaveGeneralThreadSettings,
      onSavePrivacyThreadSettings,
      threadSettingsOperationInProgress,
    ],
  );

  return threadSettingsSaveButton;
}

export default ThreadSettingsSaveButton;

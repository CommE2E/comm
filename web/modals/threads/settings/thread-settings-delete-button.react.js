// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { useOnDeleteThread } from './thread-settings-utils.js';
import Button, { buttonThemes } from '../../../components/button.react.js';

type Props = {
  +threadInfo: ThreadInfo,
  +threadSettingsOperationInProgress: boolean,
  +setErrorMessage: SetState<?string>,
};

function ThreadSettingsDeleteButton(props: Props): React.Node {
  const { threadInfo, threadSettingsOperationInProgress, setErrorMessage } =
    props;

  const onDeleteThread = useOnDeleteThread({
    threadInfo: threadInfo,
    setErrorMessage,
  });

  const threadSettingsDeleteButton = React.useMemo(
    () => (
      <Button
        onClick={onDeleteThread}
        disabled={threadSettingsOperationInProgress}
        variant="filled"
        buttonColor={buttonThemes.danger}
      >
        Delete
      </Button>
    ),
    [onDeleteThread, threadSettingsOperationInProgress],
  );

  return threadSettingsDeleteButton;
}

export default ThreadSettingsDeleteButton;

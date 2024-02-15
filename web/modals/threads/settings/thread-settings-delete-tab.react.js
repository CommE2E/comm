// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { type SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import SubmitSection from './submit-section.react.js';
import css from './thread-settings-delete-tab.css';
import { useOnDeleteThread } from './thread-settings-utils.js';
import { buttonThemes } from '../../../components/button.react.js';

type ThreadSettingsDeleteTabProps = {
  +threadSettingsOperationInProgress: boolean,
  +threadInfo: ThreadInfo,
  +setErrorMessage: SetState<?string>,
  +errorMessage?: ?string,
};

function ThreadSettingsDeleteTab(
  props: ThreadSettingsDeleteTabProps,
): React.Node {
  const {
    threadSettingsOperationInProgress,
    threadInfo,
    setErrorMessage,
    errorMessage,
  } = props;

  const onDeleteThread = useOnDeleteThread({
    threadInfo,
    setErrorMessage,
  });

  return (
    <form method="POST" className={css.container}>
      <div>
        <div className={css.warning_container}>
          <SWMansionIcon
            icon="warning-circle"
            className={css.warning_icon}
            size={26}
          />
          <p className={css.deletion_warning}>
            Your chat will be permanently deleted. There is no way to reverse
            this.
          </p>
        </div>
      </div>
      <SubmitSection
        errorMessage={errorMessage}
        onClick={onDeleteThread}
        variant="filled"
        buttonColor={buttonThemes.danger}
        disabled={threadSettingsOperationInProgress}
      >
        Delete
      </SubmitSection>
    </form>
  );
}

export default ThreadSettingsDeleteTab;

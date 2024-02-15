// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { threadTypeDescriptions } from 'lib/shared/thread-utils.js';
import { type SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type ThreadChanges } from 'lib/types/thread-types.js';

import SubmitSection from './submit-section.react.js';
import css from './thread-settings-privacy-tab.css';
import { useOnSavePrivacyThreadSettings } from './thread-settings-utils.js';
import EnumSettingsOption from '../../../components/enum-settings-option.react.js';

const { COMMUNITY_OPEN_SUBTHREAD, COMMUNITY_SECRET_SUBTHREAD } = threadTypes;

const openStatements = [
  {
    statement: threadTypeDescriptions[COMMUNITY_OPEN_SUBTHREAD],
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

const secretStatements = [
  {
    statement: threadTypeDescriptions[COMMUNITY_SECRET_SUBTHREAD],
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

type ThreadSettingsPrivacyTabProps = {
  +threadSettingsOperationInProgress: boolean,
  +threadInfo: ThreadInfo,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
  +setErrorMessage: SetState<?string>,
  +errorMessage?: ?string,
};
function ThreadSettingsPrivacyTab(
  props: ThreadSettingsPrivacyTabProps,
): React.Node {
  const {
    threadSettingsOperationInProgress,
    threadInfo,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
    errorMessage,
  } = props;

  const changeQueued: boolean = React.useMemo(
    () => Object.values(queuedChanges).some(v => v !== null && v !== undefined),
    [queuedChanges],
  );

  const onSavePrivacyThreadSettings = useOnSavePrivacyThreadSettings({
    threadInfo,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
  });

  const onOpenSelected = React.useCallback(() => {
    setQueuedChanges(prevQueuedChanges =>
      Object.freeze({
        ...prevQueuedChanges,
        type:
          COMMUNITY_OPEN_SUBTHREAD !== threadInfo.type
            ? COMMUNITY_OPEN_SUBTHREAD
            : undefined,
      }),
    );
  }, [setQueuedChanges, threadInfo.type]);

  const onSecretSelected = React.useCallback(() => {
    setQueuedChanges(prevQueuedChanges =>
      Object.freeze({
        ...prevQueuedChanges,
        type:
          COMMUNITY_SECRET_SUBTHREAD !== threadInfo.type
            ? COMMUNITY_SECRET_SUBTHREAD
            : undefined,
      }),
    );
  }, [setQueuedChanges, threadInfo.type]);

  const globeIcon = React.useMemo(
    () => <SWMansionIcon icon="globe-1" size={24} />,
    [],
  );

  const lockIcon = React.useMemo(
    () => <SWMansionIcon icon="lock-on" size={24} />,
    [],
  );

  return (
    <form method="POST" className={css.container}>
      <div className={css.form_title}>Chat type</div>
      <div className={css.enum_container}>
        <EnumSettingsOption
          selected={
            (queuedChanges.type ?? threadInfo.type) === COMMUNITY_OPEN_SUBTHREAD
          }
          onSelect={onOpenSelected}
          icon={globeIcon}
          title="Open"
          statements={openStatements}
        />
        <EnumSettingsOption
          selected={
            (queuedChanges.type ?? threadInfo.type) ===
            COMMUNITY_SECRET_SUBTHREAD
          }
          onSelect={onSecretSelected}
          icon={lockIcon}
          title="Secret"
          statements={secretStatements}
        />
      </div>

      <SubmitSection
        variant="filled"
        onClick={onSavePrivacyThreadSettings}
        disabled={threadSettingsOperationInProgress || !changeQueued}
        errorMessage={errorMessage}
      >
        Save
      </SubmitSection>
    </form>
  );
}

export default ThreadSettingsPrivacyTab;

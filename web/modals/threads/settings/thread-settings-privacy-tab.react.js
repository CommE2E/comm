// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { threadTypeDescriptions } from 'lib/shared/thread-utils.js';
import { type SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type ThickThreadChanges } from 'lib/types/thread-types.js';

import css from './thread-settings-privacy-tab.css';
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
  +threadInfo: ThreadInfo,
  +queuedChanges: ThickThreadChanges,
  +setQueuedChanges: SetState<ThickThreadChanges>,
};
function ThreadSettingsPrivacyTab(
  props: ThreadSettingsPrivacyTabProps,
): React.Node {
  const { threadInfo, queuedChanges, setQueuedChanges } = props;

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
    <div className={css.container}>
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
    </div>
  );
}

export default ThreadSettingsPrivacyTab;

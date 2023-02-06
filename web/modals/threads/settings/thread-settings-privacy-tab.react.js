// @flow

import * as React from 'react';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions';
import { useModalContext } from 'lib/components/modal-provider.react';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { threadTypeDescriptions } from 'lib/shared/thread-utils';
import { type SetState } from 'lib/types/hook-types';
import {
  type ThreadInfo,
  type ThreadChanges,
  threadTypes,
} from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import EnumSettingsOption from '../../../components/enum-settings-option.react';
import SubmitSection from './submit-section.react';
import css from './thread-settings-privacy-tab.css';

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

  const modalContext = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);

  const changeQueued: boolean = React.useMemo(
    () => Object.values(queuedChanges).some(v => v !== null && v !== undefined),
    [queuedChanges],
  );

  const changeThreadSettingsAction = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await callChangeThreadSettings({
        threadID: threadInfo.id,
        changes: queuedChanges,
      });
      modalContext.popModal();
      return response;
    } catch (e) {
      setErrorMessage('unknown_error');
      setQueuedChanges(Object.freeze({}));
      throw e;
    }
  }, [
    callChangeThreadSettings,
    modalContext,
    queuedChanges,
    setErrorMessage,
    setQueuedChanges,
    threadInfo.id,
  ]);

  const onSubmit = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      dispatchActionPromise(
        changeThreadSettingsActionTypes,
        changeThreadSettingsAction(),
      );
    },
    [changeThreadSettingsAction, dispatchActionPromise],
  );

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
        onClick={onSubmit}
        disabled={threadSettingsOperationInProgress || !changeQueued}
        errorMessage={errorMessage}
      >
        Save
      </SubmitSection>
    </form>
  );
}

export default ThreadSettingsPrivacyTab;

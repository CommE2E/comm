// @flow

import * as React from 'react';
import tinycolor from 'tinycolor2';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions.js';
import {
  threadHasPermission,
  chatNameMaxLength,
} from 'lib/shared/thread-utils.js';
import { type SetState } from 'lib/types/hook-types.js';
import {
  type ThreadInfo,
  type ThreadChanges,
  threadPermissions,
} from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import { firstLine } from 'lib/utils/string-utils.js';

import SubmitSection from './submit-section.react.js';
import css from './thread-settings-general-tab.css';
import LoadingIndicator from '../../../loading-indicator.react.js';
import Input from '../../input.react.js';
import ColorSelector from '../color-selector.react.js';

type ThreadSettingsGeneralTabProps = {
  +threadSettingsOperationInProgress: boolean,
  +threadInfo: ThreadInfo,
  +threadNamePlaceholder: string,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
  +setErrorMessage: SetState<?string>,
  +errorMessage?: ?string,
};
function ThreadSettingsGeneralTab(
  props: ThreadSettingsGeneralTabProps,
): React.Node {
  const {
    threadSettingsOperationInProgress,
    threadInfo,
    threadNamePlaceholder,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
    errorMessage,
  } = props;

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);

  const nameInputRef = React.useRef();

  React.useEffect(() => {
    nameInputRef.current?.focus();
  }, [threadSettingsOperationInProgress]);

  const changeQueued: boolean = React.useMemo(
    () => Object.values(queuedChanges).some(v => v !== null && v !== undefined),
    [queuedChanges],
  );

  const onChangeName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const target = event.currentTarget;
      const newName = firstLine(target.value);
      setQueuedChanges(prevQueuedChanges =>
        Object.freeze({
          ...prevQueuedChanges,
          name: newName !== threadInfo.name ? newName : undefined,
        }),
      );
    },
    [setQueuedChanges, threadInfo.name],
  );

  const onChangeDescription = React.useCallback(
    (event: SyntheticEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      setQueuedChanges(prevQueuedChanges =>
        Object.freeze({
          ...prevQueuedChanges,
          description:
            target.value !== threadInfo.description ? target.value : undefined,
        }),
      );
    },
    [setQueuedChanges, threadInfo.description],
  );

  const onChangeColor = React.useCallback(
    (color: string) => {
      setQueuedChanges(prevQueuedChanges =>
        Object.freeze({
          ...prevQueuedChanges,
          color: !tinycolor.equals(color, threadInfo.color) ? color : undefined,
        }),
      );
    },
    [setQueuedChanges, threadInfo.color],
  );

  const changeThreadSettingsAction = React.useCallback(async () => {
    try {
      setErrorMessage('');
      return await callChangeThreadSettings({
        threadID: threadInfo.id,
        changes: queuedChanges,
      });
    } catch (e) {
      setErrorMessage('unknown_error');
      throw e;
    } finally {
      setQueuedChanges(Object.freeze({}));
    }
  }, [
    callChangeThreadSettings,
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

  const threadNameInputDisabled = !threadHasPermission(
    threadInfo,
    threadPermissions.EDIT_THREAD_NAME,
  );

  const saveButtonContent = React.useMemo(() => {
    if (threadSettingsOperationInProgress) {
      return <LoadingIndicator status="loading" />;
    }
    return 'Save';
  }, [threadSettingsOperationInProgress]);

  return (
    <form method="POST" className={css.container}>
      <div>
        <div className={css.form_title}>Chat name</div>
        <div className={css.form_content}>
          <Input
            type="text"
            maxLength={chatNameMaxLength}
            value={firstLine(queuedChanges.name ?? threadInfo.name)}
            placeholder={threadNamePlaceholder}
            onChange={onChangeName}
            disabled={
              threadSettingsOperationInProgress || threadNameInputDisabled
            }
            ref={nameInputRef}
          />
        </div>
      </div>
      <div>
        <div className={css.form_title}>Description</div>
        <div className={css.form_content}>
          <textarea
            value={queuedChanges.description ?? threadInfo.description ?? ''}
            placeholder="Chat description"
            onChange={onChangeDescription}
            disabled={threadSettingsOperationInProgress}
            rows={3}
          />
        </div>
      </div>
      <div>
        <div className={css.form_title}>Color</div>
        <div className={css.colorSelectorContainer}>
          <ColorSelector
            currentColor={queuedChanges.color ?? threadInfo.color}
            onColorSelection={onChangeColor}
          />
        </div>
      </div>
      <SubmitSection
        variant="filled"
        errorMessage={errorMessage}
        onClick={onSubmit}
        disabled={threadSettingsOperationInProgress || !changeQueued}
      >
        {saveButtonContent}
      </SubmitSection>
    </form>
  );
}

export default ThreadSettingsGeneralTab;

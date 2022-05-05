// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { type SetState } from 'lib/types/hook-types.js';
import { type ThreadInfo, type ThreadChanges } from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import { firstLine } from 'lib/utils/string-utils';

import Button from '../../components/button.react';
import Input from '../input.react.js';
import { useModalContext } from '../modal-provider.react.js';
import ColorSelector from './color-selector.react.js';
import css from './thread-settings-general-tab.css';

type ThreadSettingsGeneralTabProps = {
  +inputDisabled: boolean,
  +threadInfo: ThreadInfo,
  +threadNamePlaceholder: string,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
  +setErrorMessage: SetState<string>,
};
function ThreadSettingsGeneralTab(
  props: ThreadSettingsGeneralTabProps,
): React.Node {
  const {
    inputDisabled,
    threadInfo,
    threadNamePlaceholder,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
  } = props;

  const modalContext = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);

  const nameInputRef = React.useRef();

  React.useEffect(() => {
    nameInputRef.current?.focus();
  }, [inputDisabled]);

  const changeQueued: boolean = React.useMemo(
    () => Object.values(queuedChanges).some(v => v !== null && v !== undefined),
    [queuedChanges],
  );

  const onChangeName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const target = event.currentTarget;
      setQueuedChanges(prevQueuedChanges =>
        Object.freeze({
          ...prevQueuedChanges,
          name: firstLine(
            target.value !== threadInfo.name ? target.value : undefined,
          ),
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
          color: color !== threadInfo.color ? color : undefined,
        }),
      );
    },
    [setQueuedChanges, threadInfo.color],
  );

  const changeThreadSettingsAction = React.useCallback(async () => {
    try {
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

  return (
    <form method="POST">
      <div>
        <div className={css.form_title}>Thread name</div>
        <div className={css.form_content}>
          <Input
            type="text"
            value={firstLine(queuedChanges.name ?? threadInfo.name)}
            placeholder={threadNamePlaceholder}
            onChange={onChangeName}
            disabled={inputDisabled}
            ref={nameInputRef}
          />
        </div>
      </div>
      <div>
        <div className={css.form_title}>Description</div>
        <div className={css.form_content}>
          <textarea
            value={queuedChanges.description ?? threadInfo.description ?? ''}
            placeholder="Thread description"
            onChange={onChangeDescription}
            disabled={inputDisabled}
          />
        </div>
      </div>
      <div>
        <div className={css.form_title}>Color</div>
        <ColorSelector
          currentColor={queuedChanges.color ?? threadInfo.color}
          onColorSelection={onChangeColor}
        />
      </div>
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={inputDisabled || !changeQueued}
        className={css.save_button}
      >
        Save
      </Button>
    </form>
  );
}

export default ThreadSettingsGeneralTab;

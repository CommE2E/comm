// @flow

import * as React from 'react';
import tinycolor from 'tinycolor2';

import { useThreadHasPermission } from 'lib/shared/thread-utils.js';
import { type SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { type ThickThreadChanges } from 'lib/types/thread-types.js';
import { firstLine } from 'lib/utils/string-utils.js';
import { chatNameMaxLength } from 'lib/utils/validation-utils.js';

import css from './thread-settings-general-tab.css';
import EditThreadAvatar from '../../../avatars/edit-thread-avatar.react.js';
import Input from '../../input.react.js';
import ColorSelector from '../color-selector.react.js';

type ThreadSettingsGeneralTabProps = {
  +threadSettingsOperationInProgress: boolean,
  +threadInfo: ThreadInfo,
  +threadNamePlaceholder: string,
  +queuedChanges: ThickThreadChanges,
  +setQueuedChanges: SetState<ThickThreadChanges>,
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
  } = props;

  const nameInputRef = React.useRef<?HTMLInputElement>();

  React.useEffect(() => {
    nameInputRef.current?.focus();
  }, [threadSettingsOperationInProgress]);

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

  const canEditThreadName = useThreadHasPermission(
    threadInfo,
    threadPermissions.EDIT_THREAD_NAME,
  );

  const threadNameInputDisabled = !canEditThreadName;

  return (
    <div className={css.container}>
      <div>
        <div className={css.editAvatarContainer}>
          <EditThreadAvatar threadInfo={threadInfo} />
        </div>
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
    </div>
  );
}

export default ThreadSettingsGeneralTab;

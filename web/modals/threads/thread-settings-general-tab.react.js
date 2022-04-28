// @flow

import * as React from 'react';

import { type SetState } from 'lib/types/hook-types.js';
import { type ThreadInfo, type ThreadChanges } from 'lib/types/thread-types';
import { firstLine } from 'lib/utils/string-utils';

import Input from '../input.react.js';
import ColorSelector from './color-selector.react.js';
import css from './thread-settings-general-tab.css';

type ThreadSettingsGeneralTabProps = {
  +inputDisabled: boolean,
  +threadInfo: ThreadInfo,
  +threadNamePlaceholder: string,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
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
  } = props;

  const onChangeName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const target = event.currentTarget;
      setQueuedChanges(
        Object.freeze({
          ...queuedChanges,
          name: firstLine(
            target.value !== threadInfo.name ? target.value : undefined,
          ),
        }),
      );
    },
    [queuedChanges, setQueuedChanges, threadInfo.name],
  );

  const onChangeDescription = React.useCallback(
    (event: SyntheticEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      setQueuedChanges(
        Object.freeze({
          ...queuedChanges,
          description:
            target.value !== threadInfo.description ? target.value : undefined,
        }),
      );
    },
    [queuedChanges, setQueuedChanges, threadInfo.description],
  );

  const onChangeColor = React.useCallback(
    (color: string) => {
      setQueuedChanges(
        Object.freeze({
          ...queuedChanges,
          color: color !== threadInfo.color ? color : undefined,
        }),
      );
    },
    [queuedChanges, setQueuedChanges, threadInfo.color],
  );

  return (
    <div>
      <div>
        <div className={css.form_title}>Thread name</div>
        <div className={css.form_content}>
          <Input
            type="text"
            value={firstLine(queuedChanges.name ?? threadInfo.name)}
            placeholder={threadNamePlaceholder}
            onChange={onChangeName}
            disabled={inputDisabled}
          />
        </div>
      </div>
      <div className={css.form_textarea_container}>
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
      <div className={css.edit_thread_color_container}>
        <div className={`${css.form_title} ${css.color_title}`}>Color</div>
        <ColorSelector
          currentColor={queuedChanges.color ?? threadInfo.color}
          onColorSelection={onChangeColor}
        />
      </div>
    </div>
  );
}

export default ThreadSettingsGeneralTab;

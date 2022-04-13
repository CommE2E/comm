// @flow

import * as React from 'react';

import Input from '../input.react.js';
import ColorSelector from './color-selector.react.js';
import css from './thread-settings-general-tab.css';

type ThreadSettingsGeneralTabProps = {
  +threadNameValue: string,
  +threadNamePlaceholder: string,
  +threadNameOnChange: (event: SyntheticEvent<HTMLInputElement>) => void,
  +threadNameDisabled: boolean,
  +threadNameInputRef: (nameInput: ?HTMLInputElement) => void,
  +threadDescriptionValue: string,
  +threadDescriptionOnChange: (
    event: SyntheticEvent<HTMLTextAreaElement>,
  ) => void,
  +threadDescriptionDisabled: boolean,
  +threadColorCurrentColor: string,
  +threadColorOnColorSelection: (color: string) => void,
};
function ThreadSettingsGeneralTab(
  props: ThreadSettingsGeneralTabProps,
): React.Node {
  const {
    threadNameValue,
    threadNamePlaceholder,
    threadNameOnChange,
    threadNameDisabled,
    threadNameInputRef,
    threadDescriptionValue,
    threadDescriptionOnChange,
    threadDescriptionDisabled,
    threadColorCurrentColor,
    threadColorOnColorSelection,
  } = props;

  return (
    <div>
      <div>
        <div className={css.form_title}>Thread name</div>
        <div className={css.form_content}>
          <Input
            type="text"
            value={threadNameValue}
            placeholder={threadNamePlaceholder}
            onChange={threadNameOnChange}
            disabled={threadNameDisabled}
            ref={threadNameInputRef}
          />
        </div>
      </div>
      <div className={css.form_textarea_container}>
        <div className={css.form_title}>Description</div>
        <div className={css.form_content}>
          <textarea
            value={threadDescriptionValue}
            placeholder="Thread description"
            onChange={threadDescriptionOnChange}
            disabled={threadDescriptionDisabled}
          />
        </div>
      </div>
      <div className={css.edit_thread_color_container}>
        <div className={`${css.form_title} ${css.color_title}`}>Color</div>
        <ColorSelector
          currentColor={threadColorCurrentColor}
          onColorSelection={threadColorOnColorSelection}
        />
      </div>
    </div>
  );
}

export default ThreadSettingsGeneralTab;

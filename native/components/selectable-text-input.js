// @flow

import * as React from 'react';

import type { Selection } from 'lib/shared/typeahead-utils.js';

import type { ClearableTextInputProps } from './clearable-text-input.js';
import ClearableTextInput from './clearable-text-input.react.js';

export type SyncedSelectionData = {
  +text: string,
  +selection: Selection,
};

export type SelectableTextInputProps = {
  ...ClearableTextInputProps,
  +clearableTextInputRef: (
    clearableTextInput: ?React.ElementRef<typeof ClearableTextInput>,
  ) => mixed,
  +onUpdateSyncedSelectionData: (data: SyncedSelectionData) => mixed,
};

export type SelectableTextInputRef = {
  +prepareForSelectionMutation: (text: string, selection: Selection) => void,
};

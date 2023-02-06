// @flow

import * as React from 'react';

import ClearableTextInput from './clearable-text-input.react';
import type {
  SelectableTextInputProps,
  SelectableTextInputRef,
} from './selectable-text-input';

const SelectableTextInput = React.forwardRef(function BaseSelectableTextInput(
  props,
  ref,
): React.Node {
  const { clearableTextInputRef, onUpdateSyncedSelectionData, ...rest } = props;

  const clearableTextInputRefCallback = React.useCallback(
    (clearableTextInput: ?React.ElementRef<typeof ClearableTextInput>) => {
      clearableTextInputRef(clearableTextInput);
    },
    [clearableTextInputRef],
  );

  const prepareForSelectionMutation = React.useCallback(() => {}, []);
  const ourRef = React.useMemo(
    () => ({
      prepareForSelectionMutation,
    }),
    [prepareForSelectionMutation],
  );

  React.useImperativeHandle(ref, () => ourRef, [ourRef]);

  return <ClearableTextInput {...rest} ref={clearableTextInputRefCallback} />;
});

const MemoizedSelectableTextInput: React.AbstractComponent<
  SelectableTextInputProps,
  SelectableTextInputRef,
> = React.memo<SelectableTextInputProps, SelectableTextInputRef>(
  SelectableTextInput,
);

export default MemoizedSelectableTextInput;

// @flow

import * as React from 'react';

// eslint-disable-next-line import/extensions
import ClearableTextInput from './clearable-text-input.react';
import type {
  SelectableTextInputProps,
  SelectableTextInputRef,
} from './selectable-text-input.js';
import type { SelectionChangeEvent } from '../types/react-native.js';

const SelectableTextInput = React.forwardRef(function BaseSelectableTextInput(
  props,
  ref,
): React.Node {
  const {
    clearableTextInputRef,
    onUpdateSyncedSelectionData,
    onSelectionChange,
    selection,
    ...rest
  } = props;

  // React Native doesn't handle controlled selection well, so we only set the
  // selection prop when we need to mutate the selection
  // https://github.com/facebook/react-native/issues/29063
  const [controlSelection, setControlSelection] = React.useState<boolean>(
    false,
  );

  const clearableTextInputRefCallback = React.useCallback(
    (clearableTextInput: ?React.ElementRef<typeof ClearableTextInput>) => {
      clearableTextInputRef(clearableTextInput);
    },
    [clearableTextInputRef],
  );

  const prepareForSelectionMutation = React.useCallback(
    () => setControlSelection(true),
    [],
  );
  const ourRef = React.useMemo(
    () => ({
      prepareForSelectionMutation,
    }),
    [prepareForSelectionMutation],
  );
  React.useImperativeHandle(ref, () => ourRef, [ourRef]);

  // - It's important for us to keep text and selection state in sync, since
  //   upstream code in ChatInputBar processes this data during render to
  //   generate a list of @-mention suggestions
  // - On Android, text change events precede selection events, and each leads
  //   to a separate React render cycle
  // - To prevent render cycles where the data isn't in sync, we defer text
  //   change events until the corresponding selection event comes in
  const onSelectionChangeOverride = React.useCallback(
    (event: SelectionChangeEvent) => {
      setControlSelection(false);
      onSelectionChange?.(event);
      onUpdateSyncedSelectionData({
        text: props.value,
        selection: event.nativeEvent.selection,
      });
    },
    [onUpdateSyncedSelectionData, props.value, onSelectionChange],
  );

  return (
    <ClearableTextInput
      {...rest}
      onSelectionChange={onSelectionChangeOverride}
      selection={controlSelection ? selection : undefined}
      ref={clearableTextInputRefCallback}
    />
  );
});

const MemoizedSelectableTextInput: React.AbstractComponent<
  SelectableTextInputProps,
  SelectableTextInputRef,
> = React.memo<SelectableTextInputProps, SelectableTextInputRef>(
  SelectableTextInput,
);

export default MemoizedSelectableTextInput;

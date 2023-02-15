// @flow

import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import type { Selection } from 'lib/shared/mention-utils.js';

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
    onChangeText,
    onSelectionChange,
    onUpdateSyncedSelectionData,
    ...rest
  } = props;

  // React Native doesn't handle controlled selection well, so we only set the
  // selection prop when we need to mutate the selection
  // https://github.com/facebook/react-native/issues/29063
  const [controlSelection, setControlSelection] =
    React.useState<boolean>(false);

  const clearableTextInputRefCallback = React.useCallback(
    (clearableTextInput: ?React.ElementRef<typeof ClearableTextInput>) => {
      clearableTextInputRef(clearableTextInput);
    },
    [clearableTextInputRef],
  );

  // - It's important for us to keep text and selection state in sync, since
  //   upstream code in ChatInputBar processes this data during render to
  //   generate a list of @-mention suggestions
  // - On iOS, selection events precede text change events, and each leads to a
  //   separate React render cycle
  // - To prevent render cycles where the data isn't in sync, we defer selection
  //   events until the corresponding text change event comes in
  // - Since selection events can happen without text changes (user moving the
  //   cursor) we also set a debounced timeout after each selection event that
  //   will activate if no corresponding text change event comes in within 50ms
  const pendingSelectionEventRef = React.useRef<?Selection>();
  const sendPendingSelectionEvent = React.useCallback(
    (text: string) => {
      const pendingSelectionEvent = pendingSelectionEventRef.current;
      if (!pendingSelectionEvent) {
        return;
      }
      pendingSelectionEventRef.current = undefined;
      onUpdateSyncedSelectionData({ text, selection: pendingSelectionEvent });
    },
    [onUpdateSyncedSelectionData],
  );

  const onChangeTextOverride = React.useCallback(
    (text: string) => {
      onChangeText(text);
      sendPendingSelectionEvent(text);
    },
    [onChangeText, sendPendingSelectionEvent],
  );

  // When a user selects a @-mention in the middle of some text, React Native on
  // iOS has a strange bug where it emits two selection events in a row:
  // - The first selection event resets the cursor to the very end of the text
  // - The second selection event puts the cursor back where it should go, which
  //   is the middle of the text where it started, but after the new text that
  //   just got inserted
  // In contrast, if an @-mention is entered at the end, only the first event
  // occurs. We actually want to ignore both, because we manually reset the
  // selection state ourselves and these events don't reflect our updates.
  const numNextSelectionEventsToIgnoreRef = React.useRef(0);

  const prepareForSelectionMutation = React.useCallback(
    (text: string, selection: Selection) => {
      setControlSelection(true);
      numNextSelectionEventsToIgnoreRef.current =
        selection.start === text.length ? 1 : 2;
    },
    [],
  );
  const ourRef = React.useMemo(
    () => ({
      prepareForSelectionMutation,
    }),
    [prepareForSelectionMutation],
  );
  React.useImperativeHandle(ref, () => ourRef, [ourRef]);

  const debouncedSendPendingSelectionEvent = React.useMemo(
    () => _debounce(sendPendingSelectionEvent, 50),
    [sendPendingSelectionEvent],
  );
  const onSelectionChangeOverride = React.useCallback(
    (event: SelectionChangeEvent) => {
      if (numNextSelectionEventsToIgnoreRef.current <= 1) {
        // If after this tick we will start allowing selection events through,
        // then we will drop control of selection
        setControlSelection(false);
      }
      if (numNextSelectionEventsToIgnoreRef.current > 0) {
        numNextSelectionEventsToIgnoreRef.current--;
        return;
      }
      pendingSelectionEventRef.current = event.nativeEvent.selection;
      debouncedSendPendingSelectionEvent(props.value);
      if (onSelectionChange) {
        onSelectionChange(event);
      }
    },
    [debouncedSendPendingSelectionEvent, props.value, onSelectionChange],
  );

  return (
    <ClearableTextInput
      {...rest}
      onChangeText={onChangeTextOverride}
      onSelectionChange={onSelectionChangeOverride}
      selection={controlSelection ? rest.selection : undefined}
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

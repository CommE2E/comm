// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TooltipItemBaseProps } from './tooltip-item.react.js';

type RegisterOptionInput = {
  ...TooltipItemBaseProps,
  +symbol: symbol,
};
type RegisterOptionOutput = { +shouldRender: boolean };
export type TooltipContextType = {
  +registerOption: (input: RegisterOptionInput) => RegisterOptionOutput,
  +unregisterOption: (id: string) => void,
  +showActionSheet: () => void,
  +shouldShowMore: () => boolean,
  +getNumVisibleEntries: () => number,
};
const TooltipContext: React.Context<?TooltipContextType> =
  React.createContext<?TooltipContextType>();

type ProviderProps = {
  +maxOptionsToDisplay: number,
  +visibleEntryIDs: ?$ReadOnlyArray<string>,
  +cancel: () => mixed,
  +hideTooltip: () => mixed,
  +children: React.Node,
};
function TooltipContextProvider(props: ProviderProps): React.Node {
  const optionsRef = React.useRef<RegisterOptionInput[]>([]);

  const { visibleEntryIDs } = props;
  const visibleEntryIDsSet = React.useMemo(
    () => new Set(visibleEntryIDs ?? []),
    [visibleEntryIDs],
  );

  const { maxOptionsToDisplay } = props;
  const registerOption = React.useCallback(
    (input: RegisterOptionInput) => {
      const options = optionsRef.current;

      const existingIndex = options.findIndex(option => option.id === input.id);
      if (existingIndex === -1) {
        options.push(input);
      } else {
        if (options[existingIndex].symbol !== input.symbol) {
          console.warn(`multiple TooltipItems registered with ID ${input.id}`);
        }
        options[existingIndex] = input;
      }

      const optionsToDisplay = options.filter(option =>
        visibleEntryIDsSet.has(option.id),
      );
      const displayIndex = optionsToDisplay.findIndex(
        option => option.id === input.id,
      );
      const cutoff =
        optionsToDisplay.length === maxOptionsToDisplay
          ? maxOptionsToDisplay
          : maxOptionsToDisplay - 1;

      const shouldRender =
        input.id === 'more' || (displayIndex >= 0 && displayIndex < cutoff);
      return { shouldRender };
    },
    [maxOptionsToDisplay, visibleEntryIDsSet],
  );

  const unregisterOption = React.useCallback((id: string) => {
    optionsRef.current = optionsRef.current.filter(option => option.id !== id);
  }, []);

  const insets = useSafeAreaInsets();

  const { cancel, hideTooltip } = props;
  const { showActionSheetWithOptions } = useActionSheet();
  const showActionSheet = React.useCallback(() => {
    hideTooltip();

    const options = optionsRef.current;

    const optionsToDisplay = options.filter(option =>
      visibleEntryIDsSet.has(option.id),
    );

    const filteredOptions = optionsToDisplay.slice(maxOptionsToDisplay - 1);

    const cancelButtonExists = options.some(option => option.isCancel);
    if (Platform.OS === 'ios' && !cancelButtonExists) {
      filteredOptions.push({
        id: 'cancel',
        text: 'Cancel',
        onPress: cancel,
        isCancel: true,
        symbol: Symbol(),
      });
    }

    // We're reversing options to populate the action sheet from bottom to
    // top instead of the default (top to bottom) ordering.
    filteredOptions.reverse();

    const texts = filteredOptions.map(option => option.text);

    const destructiveButtonIndices = filteredOptions
      .filter(option => option.isDestructive)
      .map((_, i) => i);

    const cancelButtonIndex = filteredOptions.findIndex(
      option => option.isCancel,
    );

    const icons = filteredOptions.map(option =>
      option.renderIcon ? option.renderIcon(styles.bottomSheetIcon) : undefined,
    );

    const onPressAction = (selectedIndex: ?number) => {
      if (
        selectedIndex === null ||
        selectedIndex === undefined ||
        selectedIndex < 0
      ) {
        cancel();
        return;
      }
      filteredOptions[selectedIndex].onPress();
    };

    const containerStyle = {
      paddingBottom: insets.bottom,
    };
    showActionSheetWithOptions(
      {
        options: texts,
        cancelButtonIndex,
        destructiveButtonIndex: destructiveButtonIndices,
        containerStyle,
        icons,
      },
      onPressAction,
    );
  }, [
    hideTooltip,
    maxOptionsToDisplay,
    insets.bottom,
    showActionSheetWithOptions,
    visibleEntryIDsSet,
    cancel,
  ]);

  const shouldShowMore = React.useCallback(() => {
    const options = optionsRef.current;
    const optionsToDisplay = options.filter(option =>
      visibleEntryIDsSet.has(option.id),
    );
    return optionsToDisplay.length > maxOptionsToDisplay;
  }, [maxOptionsToDisplay, visibleEntryIDsSet]);

  const getNumVisibleEntries = React.useCallback(() => {
    const options = optionsRef.current;
    const optionsToDisplay = options.filter(option =>
      visibleEntryIDsSet.has(option.id),
    );
    return Math.min(optionsToDisplay.length, maxOptionsToDisplay);
  }, [maxOptionsToDisplay, visibleEntryIDsSet]);

  const context = React.useMemo(
    () => ({
      registerOption,
      unregisterOption,
      showActionSheet,
      shouldShowMore,
      getNumVisibleEntries,
    }),
    [
      registerOption,
      unregisterOption,
      showActionSheet,
      shouldShowMore,
      getNumVisibleEntries,
    ],
  );
  const { children } = props;
  return (
    <TooltipContext.Provider value={context}>
      {children}
    </TooltipContext.Provider>
  );
}

const styles = StyleSheet.create({
  bottomSheetIcon: {
    color: '#000000',
  },
});

export { TooltipContext, TooltipContextProvider };

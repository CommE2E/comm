// flow-typed signature: d46be163849e39e248d58b8d54ae8f16
// flow-typed version: <<STUB>>/@expo/react-native-action-sheet_v3.14.0/flow_v0.158.0

declare module '@expo/react-native-action-sheet' {
  // This was taken from the flow typed library definitions of bottom-tabs_v6
  declare type StyleObj =
    | null
    | void
    | number
    | false
    | ''
    | $ReadOnlyArray<StyleObj>
    | { [name: string]: any, ... };

  declare type ViewStyleProp = StyleObj;
  declare type TextStyleProp = StyleObj;

  declare export type ActionSheetIOSOptions = {|
    +options: $ReadOnlyArray<string>,
    +title?: string,
    +message?: string,
    +tintColor?: string,
    +cancelButtonIndex?: number,
    +destructiveButtonIndex?: number | $ReadOnlyArray<number>,
    +anchor?: number,
    +userInterfaceStyle?: 'light' | 'dark',
    +disabledButtonIndices?: $ReadOnlyArray<number>,
  |};

  declare export type ActionSheetOptions = {|
    ...ActionSheetIOSOptions,
    +icons?: $ReadOnlyArray<React$Node>,
    +tintIcons?: boolean,
    +textStyle?: TextStyleProp,
    +titleTextStyle?: TextStyleProp,
    +messageTextStyle?: TextStyleProp,
    +autoFocus?: boolean,
    +showSeparators?: boolean,
    +containerStyle?: ViewStyleProp,
    +separatorStyle?: ViewStyleProp,
    +useModal?: boolean,
    +destructiveColor?: string,
  |};

  declare export type ShowActionSheetWithOptions = (
    options: ActionSheetOptions,
    callback: (i?: number) => void | Promise<void>,
  ) => void;

  declare export type ActionSheetProps = {
    +showActionSheetWithOptions: ShowActionSheetWithOptions,
  };

  declare export function useActionSheet(): ActionSheetProps;

  declare export type ActionSheetProviderProps = {|
    +children: React$Node,
    +useNativeDriver?: boolean,
    +useCustomActionSheet?: boolean,
  |};

  declare export class ActionSheetProvider
    extends React$Component<ActionSheetProviderProps> {}
}

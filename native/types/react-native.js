// @flow

export type {
  Layout,
  LayoutEvent,
  ScrollEvent,
} from 'react-native/Libraries/Types/CoreEventTypes';

export type {
  ContentSizeChangeEvent,
  KeyPressEvent,
  BlurEvent,
} from 'react-native/Libraries/Components/TextInput/TextInput';

export type { NativeMethods } from 'react-native/Libraries/Renderer/shims/ReactNativeTypes';

import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';

export type ViewableItemsChange = {
  +viewableItems: ViewToken[],
  +changed: ViewToken[],
  ...
};

export type EmitterSubscription = { +remove: () => void, ... };

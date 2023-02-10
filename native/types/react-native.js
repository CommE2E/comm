// @flow

import type ReactNativeAnimatedValue from 'react-native/Libraries/Animated/nodes/AnimatedValue.js';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper.js';

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

export type { SelectionChangeEvent } from 'react-native/Libraries/Components/TextInput/TextInput';

export type { NativeMethods } from 'react-native/Libraries/Renderer/shims/ReactNativeTypes';

export type { KeyboardEvent } from 'react-native/Libraries/Components/Keyboard/Keyboard';

export type { EventSubscription } from 'react-native/Libraries/vendor/emitter/EventEmitter';

export type AnimatedValue = ReactNativeAnimatedValue;

export type ViewableItemsChange = {
  +viewableItems: ViewToken[],
  +changed: ViewToken[],
  ...
};

export type EmitterSubscription = { +remove: () => void, ... };

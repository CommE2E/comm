// @flow

import AnimatedInterpolation from 'react-native/Libraries/Animated/nodes/AnimatedInterpolation.js';
import type ReactNativeAnimatedValue from 'react-native/Libraries/Animated/nodes/AnimatedValue.js';
import type { ImageSource } from 'react-native/Libraries/Image/ImageSource.js';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper.js';
import type { ____ViewStyle_Internal } from 'react-native/Libraries/StyleSheet/StyleSheetTypes.js';

export type {
  LayoutRectangle,
  LayoutChangeEvent,
  ScrollEvent,
} from 'react-native/Libraries/Types/CoreEventTypes.js';

export type {
  TextInputContentSizeChangeEvent,
  TextInputKeyPressEvent,
  TextInputFocusEvent,
  TextInputBlurEvent,
  TextInputSelectionChangeEvent,
} from 'react-native/Libraries/Components/TextInput/TextInput.js';

export type { KeyboardEvent } from 'react-native/Libraries/Components/Keyboard/Keyboard.js';

export type { EventSubscription } from 'react-native/Libraries/vendor/emitter/EventEmitter.js';

export type AnimatedValue = ReactNativeAnimatedValue;

export type ViewableItemsChange = {
  +viewableItems: ViewToken[],
  +changed: ViewToken[],
  ...
};

export type EmitterSubscription = { +remove: () => void, ... };

export type ImagePasteEvent = {
  +fileName: string,
  +filePath: string,
  +height: number,
  +width: number,
  +threadID: string,
};

export type { AnimatedInterpolation };

export type ViewStyleObj = ____ViewStyle_Internal;

export type { ImageSource };

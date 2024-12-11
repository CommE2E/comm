// @flow

import type { LeafRoute } from '@react-navigation/core';
import { useRoute } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { type MediaInfo } from 'lib/types/media-types.js';

import InlineMultimedia from './inline-multimedia.react.js';
import { getMediaKey } from './multimedia-message-utils.js';
import { type PendingMultimediaUpload } from '../input/input-state.js';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import { ImageModalRouteName } from '../navigation/route-names.js';
import { type Colors, useColors } from '../themes/colors.js';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types.js';
import type {
  VerticalBounds,
  LayoutCoordinates,
} from '../types/layout-types.js';
import {
  type ViewStyle,
  type AnimatedStyleObj,
  AnimatedView,
} from '../types/styles.js';

type BaseProps = {
  +mediaInfo: MediaInfo,
  +item: ChatMultimediaMessageInfoItem,
  +verticalBounds: ?VerticalBounds,
  +style: ViewStyle,
  +postInProgress: boolean,
  +pendingUpload: ?PendingMultimediaUpload,
  +onPressMultimedia?: (
    mediaInfo: MediaInfo,
    initialCoordinates: LayoutCoordinates,
  ) => void,
  +clickable: boolean,
  +setClickable: boolean => void,
};
type Props = {
  ...BaseProps,
  +route: LeafRoute<>,
  // Redux state
  +colors: Colors,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  +viewRef: { current: ?React.ElementRef<typeof View> },
  +onPress: () => void,
  +onLayout: () => void,
  +animatedWrapperStyle: AnimatedStyleObj,
};

class MultimediaMessageMultimedia extends React.PureComponent<Props> {
  static getOverlayContext(props: Props): OverlayContextType {
    const { overlayContext } = props;
    invariant(
      overlayContext,
      'MultimediaMessageMultimedia should have OverlayContext',
    );
    return overlayContext;
  }

  componentDidUpdate(prevProps: Props) {
    const scrollIsDisabled =
      MultimediaMessageMultimedia.getOverlayContext(this.props)
        .scrollBlockingModalStatus !== 'closed';
    const scrollWasDisabled =
      MultimediaMessageMultimedia.getOverlayContext(prevProps)
        .scrollBlockingModalStatus !== 'closed';
    if (!scrollIsDisabled && scrollWasDisabled) {
      this.props.setClickable(true);
    }
  }

  render(): React.Node {
    const {
      mediaInfo,
      pendingUpload,
      postInProgress,
      viewRef,
      onPress,
      onLayout,
      animatedWrapperStyle,
    } = this.props;

    const wrapperStyles = [
      styles.container,
      animatedWrapperStyle,
      this.props.style,
    ];
    return (
      <AnimatedView style={wrapperStyles}>
        <View style={styles.expand} onLayout={onLayout} ref={viewRef}>
          <InlineMultimedia
            mediaInfo={mediaInfo}
            onPress={onPress}
            postInProgress={postInProgress}
            pendingUpload={pendingUpload}
            spinnerColor={this.props.item.threadInfo.color}
          />
        </View>
      </AnimatedView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  expand: {
    flex: 1,
  },
});

const ConnectedMultimediaMessageMultimedia: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMultimediaMessageMultimedia(
    props: BaseProps,
  ) {
    const colors = useColors();
    const keyboardState = React.useContext(KeyboardContext);
    const overlayContext = React.useContext(OverlayContext);
    invariant(
      overlayContext,
      'MultimediaMessageMultimedia should have OverlayContext',
    );
    const route = useRoute();
    const viewRef = React.useRef<?React.ElementRef<typeof View>>();

    const dismissKeyboardIfShowing = React.useCallback((): boolean => {
      return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
    }, [keyboardState]);

    const onPress = React.useCallback(() => {
      const {
        clickable,
        verticalBounds,
        onPressMultimedia,
        setClickable,
        mediaInfo,
      } = props;
      if (!clickable) {
        return;
      }

      if (dismissKeyboardIfShowing()) {
        return;
      }

      const view = viewRef.current;
      if (!view || !verticalBounds) {
        return;
      }

      const measureCallback = onPressMultimedia;
      if (!measureCallback) {
        return;
      }

      setClickable(false);

      overlayContext.setScrollBlockingModalStatus('open');

      view.measure((x, y, width, height, pageX, pageY) => {
        const coordinates = { x: pageX, y: pageY, width, height };
        measureCallback(mediaInfo, coordinates);
      });
    }, [dismissKeyboardIfShowing, overlayContext, props]);

    const onLayout = React.useCallback(() => {}, []);

    const overlayPosition = (() => {
      const { visibleOverlays } = overlayContext;
      for (const overlay of visibleOverlays) {
        if (
          overlay.routeName === ImageModalRouteName &&
          overlay.presentedFrom === route.key &&
          overlay.routeKey === getMediaKey(props.item, props.mediaInfo)
        ) {
          return overlay.positionV2;
        }
      }
      return undefined;
    })();

    const animatedWrapperStyle = useAnimatedStyle(() => {
      let opacity;
      if (overlayPosition) {
        opacity =
          1 -
          interpolate(
            overlayPosition.value,
            [0.1, 0.11],
            [0, 1],
            Extrapolate.CLAMP,
          );
      } else {
        opacity = 1;
      }
      return {
        opacity,
      };
    });

    return (
      <MultimediaMessageMultimedia
        {...props}
        colors={colors}
        route={route}
        keyboardState={keyboardState}
        overlayContext={overlayContext}
        viewRef={viewRef}
        onPress={onPress}
        onLayout={onLayout}
        animatedWrapperStyle={animatedWrapperStyle}
      />
    );
  });

export default ConnectedMultimediaMessageMultimedia;

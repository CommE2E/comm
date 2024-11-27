// @flow

import invariant from 'invariant';
import * as React from 'react';
import { withTiming } from 'react-native-reanimated';

import type { AppNavigationProp } from './app-navigator.react.js';
import { OverlayContext } from './overlay-context.js';
import type { NUXTipRouteNames, NavigationRoute } from './route-names';
import {
  getNUXTipParams,
  type NUXTip,
} from '../components/nux-tips-context.react.js';
import { useStyles } from '../themes/colors.js';
import { animationDuration } from '../tooltip/nux-tips-overlay.react.js';
import { AnimatedView } from '../types/styles.js';

export type NUXTipsOverlayBackdropParams = {
  +orderedTips: $ReadOnlyArray<NUXTip>,
};

type Props = {
  +navigation: AppNavigationProp<'NUXTipOverlayBackdrop'>,
  +route: NavigationRoute<'NUXTipOverlayBackdrop'>,
};

function NUXTipOverlayBackdrop(props: Props): React.Node {
  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');
  const { shouldRenderScreenContent } = overlayContext;

  return shouldRenderScreenContent ? (
    <NUXTipOverlayBackdropInner {...props} />
  ) : null;
}

function opacityEnteringAnimation() {
  'worklet';

  return {
    animations: {
      opacity: withTiming(0.7, { duration: animationDuration }),
    },
    initialValues: {
      opacity: 0,
    },
  };
}

function NUXTipOverlayBackdropInner(props: Props): React.Node {
  const { navigation, route } = props;

  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');
  const { onExitFinish } = overlayContext;

  const styles = useStyles(unboundStyles);

  const orderedTips = route.params?.orderedTips;
  invariant(
    orderedTips && orderedTips.length > 0,
    'orderedTips is required and should not be empty.',
  );
  const firstTip = orderedTips[0];

  const opacityExitingAnimation = React.useCallback(() => {
    'worklet';

    return {
      animations: {
        opacity: withTiming(0, { duration: animationDuration }),
      },
      initialValues: {
        opacity: 0.7,
      },
      callback: onExitFinish,
    };
  }, [onExitFinish]);

  const { routeName } = getNUXTipParams(firstTip);

  React.useEffect(
    () => {
      navigation.navigate<NUXTipRouteNames>({
        name: routeName,
        params: {
          orderedTips,
          orderedTipsIndex: 0,
        },
      });
    },
    // We want this effect to run exactly once, when this component is mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <AnimatedView
      style={styles.backdrop}
      entering={opacityEnteringAnimation}
      exiting={opacityExitingAnimation}
    />
  );
}

const unboundStyles = {
  backdrop: {
    backgroundColor: 'black',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
};

export default NUXTipOverlayBackdrop;

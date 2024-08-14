// @flow

import { useRoute } from '@react-navigation/core';
import * as React from 'react';
import { Animated, Text, View } from 'react-native';
import { TabBarItem } from 'react-native-tab-view';

import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import { backgroundChatThreadListOptions } from '../chat/chat-options.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import { LightTheme, DarkTheme } from '../themes/navigation.js';
import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const mutedTabTipTextBase =
  'When you mute a chat, it automatically gets moved to this tab.';
const mutedTabTipTextIfFID =
  ' When Comm automatically adds you to a community associated with a ' +
  'Farcaster channel you follow, we mute them by default.';

const dummyCallback = () => {};
const dummyNavigationState = { index: 0, routes: [] };

const unboundStyles = {
  button: {
    flexDirection: 'row',
    backgroundColor: 'tabBarBackground',
  },
  label: {
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: 13,
    margin: 4,
    backgroundColor: 'transparent',
  },
  icon: {
    height: 24,
    width: 24,
  },
};

function WrappedChatTabBarButton(): React.Node {
  const { title, tabBarIcon: Icon } = backgroundChatThreadListOptions;

  const position = React.useRef(() => new Animated.Value(0));
  const route = useRoute();

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const color = React.useMemo(
    () =>
      activeTheme === 'dark' ? DarkTheme.colors.text : LightTheme.colors.text,
    [activeTheme],
  );

  const styles = useStyles(unboundStyles);

  const renderLabel = React.useCallback(
    ({ color: labelColor }: { color: string, ... }) => {
      return <Text style={[styles.label, { color: labelColor }]}>{title}</Text>;
    },
    [styles.label, title],
  );

  const renderIcon = React.useCallback(
    ({ color: iconColor }: { color: string, ... }) => {
      return (
        <View style={styles.icon}>
          <Icon color={iconColor} />
        </View>
      );
    },
    [styles.icon],
  );

  const renderLabelText = React.useCallback(() => title, [title]);

  return (
    <TabBarItem
      position={position.current}
      route={route}
      navigationState={dummyNavigationState}
      onPress={dummyCallback}
      onLongPress={dummyCallback}
      style={styles.button}
      getLabelText={renderLabelText}
      getAccessible={dummyCallback}
      getAccessibilityLabel={dummyCallback}
      renderIcon={renderIcon}
      getTestID={dummyCallback}
      activeColor={color}
      renderLabel={renderLabel}
    />
  );
}

function MutedTabTip(props: NUXTipsOverlayProps<'MutedTabTip'>): React.Node {
  const fid = useCurrentUserFID();
  const text = React.useMemo(() => {
    if (!fid) {
      return mutedTabTipTextBase;
    }
    return mutedTabTipTextBase + mutedTabTipTextIfFID;
  }, [fid]);

  const MutedTabTipComponent: React.ComponentType<
    NUXTipsOverlayProps<'MutedTabTip'>,
  > = createNUXTipsOverlay(WrappedChatTabBarButton, text);

  return <MutedTabTipComponent {...props} />;
}

export default MutedTabTip;

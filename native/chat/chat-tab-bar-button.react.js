// @flow

import invariant from 'invariant';
import * as React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

import { threadSettingsNotificationsCopy } from 'lib/shared/thread-settings-notifications-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import {
  nuxTip,
  NUXTipsContext,
} from '../components/nux-tips-context.react.js';
import { useStyles } from '../themes/colors.js';
import { LightTheme, DarkTheme } from '../themes/navigation.js';

type Props = {
  +title: string,
  +tabBarIcon?:
    | string
    | (({ +color: string, +focused: boolean }) => React$Node),
  +onPress?: () => void,
  +onLongPress?: () => void,
  +isFocused?: boolean,
  +tabBarAccessibilityLabel?: string,
  +tabBarTestID?: string,
};

const ButtonTitleToTip = Object.freeze({
  [threadSettingsNotificationsCopy.MUTED]: nuxTip.MUTED,
  [threadSettingsNotificationsCopy.HOME]: nuxTip.HOME,
});

const unboundStyles = {
  button: {
    flex: 1,
    backgroundColor: 'tabBarBackground',
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  tabBarIndicatorStyle: {
    borderColor: 'tabBarAccent',
    borderBottomWidth: 2,
  },
};

export default function TabBarButton(props: Props): React.Node {
  const {
    title,
    tabBarIcon,
    onPress,
    onLongPress,
    isFocused,
    tabBarAccessibilityLabel,
    tabBarTestID,
  } = props;

  const styles = useStyles(unboundStyles);

  const viewRef = React.useRef<?React.ElementRef<typeof View>>();

  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');

  const onLayout = () => {
    const button = viewRef.current;
    if (!button) {
      return;
    }
    const tipType = ButtonTitleToTip[title];
    if (!tipType) {
      return;
    }
    button.measure((x, y, width, height, pageX, pageY) => {
      tipsContext.registerTipButton(tipType, {
        x,
        y,
        width,
        height,
        pageX,
        pageY,
      });
    });
  };

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);

  const textColor = React.useMemo(() => {
    const color =
      activeTheme === 'dark' ? DarkTheme.colors.text : LightTheme.colors.text;

    if (!isFocused) {
      return 'gray';
    }
    return color;
  }, [activeTheme, isFocused]);

  const icon = React.useMemo(
    () =>
      typeof tabBarIcon === 'string' || !tabBarIcon
        ? tabBarIcon
        : tabBarIcon({ color: textColor, focused: isFocused ?? false }),
    [isFocused, tabBarIcon, textColor],
  );

  const buttonStyle = React.useMemo(() => {
    if (isFocused) {
      return [styles.button, styles.tabBarIndicatorStyle];
    }
    return styles.button;
  }, [isFocused, styles.button, styles.tabBarIndicatorStyle]);

  const textStyle = React.useMemo(
    () => ({
      color: textColor,
      textTransform: 'uppercase',
      fontSize: 14,
      margin: 4,
      textAlign: 'center',
      backgroundColor: 'transparent',
    }),
    [textColor],
  );

  return (
    <View ref={viewRef} onLayout={onLayout} style={buttonStyle}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={tabBarAccessibilityLabel}
        testID={tabBarTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.innerContainer}
      >
        {icon}
        <Text style={textStyle}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
}

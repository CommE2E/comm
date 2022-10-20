// @flow

import * as React from 'react';
import { Text, Linking, Alert, Platform } from 'react-native';

import { normalizeURL } from 'lib/utils/url-utils';

import { MarkdownContext, type MarkdownContextType } from './markdown-context';

function useDisplayLinkPrompt(
  inputURL: string,
  markdownContext: ?MarkdownContextType,
) {
  const setLinkModalActive = markdownContext?.setLinkModalActive;
  const onDismiss = React.useCallback(() => {
    setLinkModalActive?.(false);
  }, [setLinkModalActive]);

  const url = normalizeURL(inputURL);
  const onConfirm = React.useCallback(() => {
    onDismiss();
    Linking.openURL(url);
  }, [url, onDismiss]);

  let displayURL = url.substring(0, 64);
  if (url.length > displayURL.length) {
    displayURL += '…';
  }
  return React.useCallback(() => {
    setLinkModalActive && setLinkModalActive(true);
    Alert.alert(
      'External link',
      `You sure you want to open this link?\n\n${displayURL}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: onDismiss },
        { text: 'Open', onPress: onConfirm },
      ],
      { cancelable: true, onDismiss },
    );
  }, [setLinkModalActive, displayURL, onConfirm, onDismiss]);
}

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +target: string,
  +children: React.Node,
  ...TextProps,
};
function MarkdownLink(props: Props): React.Node {
  const markdownContext = React.useContext(MarkdownContext);

  const { target, ...rest } = props;
  const onPressLink = useDisplayLinkPrompt(target, markdownContext);

  const setLinkPressActive = markdownContext?.setLinkPressActive;
  const androidOnStartShouldSetResponderCapture = React.useCallback(() => {
    setLinkPressActive?.(true);
    return true;
  }, [setLinkPressActive]);

  const activePressHasMoved = React.useRef(false);
  const androidOnResponderMove = React.useCallback(() => {
    activePressHasMoved.current = true;
  }, []);

  const androidOnResponderTerminate = React.useCallback(() => {
    if (!activePressHasMoved.current) {
      onPressLink();
    }
    activePressHasMoved.current = false;
    setLinkPressActive?.(false);
  }, [onPressLink, setLinkPressActive]);

  if (Platform.OS !== 'android') {
    return <Text onPress={onPressLink} {...rest} />;
  }

  // The Flow type for Text's props is missing onStartShouldSetResponderCapture
  const gestureProps: any = {
    onStartShouldSetResponderCapture: androidOnStartShouldSetResponderCapture,
    onResponderMove: androidOnResponderMove,
    onResponderTerminate: androidOnResponderTerminate,
  };

  return <Text {...gestureProps} {...rest} />;
}

export default MarkdownLink;

// @flow

import * as React from 'react';
import { Text, Linking, Alert, Platform } from 'react-native';

import { normalizeURL } from 'lib/utils/url-utils';

import { MessageContext } from '../chat/message-context.react';
import { MarkdownContext, type MarkdownContextType } from './markdown-context';

function useDisplayLinkPrompt(
  inputURL: string,
  markdownContext: ?MarkdownContextType,
  messageKey: string,
) {
  const setLinkModalActive = markdownContext?.setLinkModalActive;
  const linkModalActive = markdownContext?.linkModalActive;
  const onDismiss = React.useCallback(() => {
    if (linkModalActive) {
      setLinkModalActive?.({ ...linkModalActive, [messageKey]: false });
    }
  }, [setLinkModalActive, linkModalActive, messageKey]);

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
    setLinkModalActive &&
      linkModalActive &&
      setLinkModalActive({ ...linkModalActive, [messageKey]: true });
    Alert.alert(
      'External link',
      `You sure you want to open this link?\n\n${displayURL}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: onDismiss },
        { text: 'Open', onPress: onConfirm },
      ],
      { cancelable: true, onDismiss },
    );
  }, [
    setLinkModalActive,
    linkModalActive,
    messageKey,
    displayURL,
    onConfirm,
    onDismiss,
  ]);
}

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +target: string,
  +children: React.Node,
  ...TextProps,
};
function MarkdownLink(props: Props): React.Node {
  const markdownContext = React.useContext(MarkdownContext);
  const messageContext = React.useContext(MessageContext);

  const messageKey = messageContext?.messageKey;

  const { target, ...rest } = props;
  const onPressLink = useDisplayLinkPrompt(target, markdownContext, messageKey);

  const setLinkPressActive = markdownContext?.setLinkPressActive;
  const linkPressActive = markdownContext?.linkPressActive;

  const androidOnStartShouldSetResponderCapture = React.useCallback(() => {
    if (linkPressActive) {
      setLinkPressActive?.({ ...linkPressActive, [messageKey]: true });
    }
    return true;
  }, [setLinkPressActive, linkPressActive, messageKey]);

  const activePressHasMoved = React.useRef(false);
  const androidOnResponderMove = React.useCallback(() => {
    activePressHasMoved.current = true;
  }, []);

  const androidOnResponderTerminate = React.useCallback(() => {
    if (!activePressHasMoved.current) {
      onPressLink();
    }
    activePressHasMoved.current = false;
    if (linkPressActive) {
      setLinkPressActive?.({ ...linkPressActive, [messageKey]: false });
    }
  }, [onPressLink, setLinkPressActive, linkPressActive, messageKey]);

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

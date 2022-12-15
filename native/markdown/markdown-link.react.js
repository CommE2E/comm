// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, Linking, Alert } from 'react-native';

import { normalizeURL } from 'lib/utils/url-utils';

import { MessagePressResponderContext } from '../chat/message-press-responder-context';
import { TextMessageMarkdownContext } from '../chat/text-message-markdown-context';
import { MarkdownContext, type MarkdownContextType } from './markdown-context';

function useDisplayLinkPrompt(
  inputURL: string,
  markdownContext: MarkdownContextType,
  messageKey: ?string,
) {
  const { setLinkModalActive } = markdownContext;
  const onDismiss = React.useCallback(() => {
    messageKey && setLinkModalActive({ [messageKey]: false });
  }, [setLinkModalActive, messageKey]);

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
    messageKey && setLinkModalActive({ [messageKey]: true });
    Alert.alert(
      'External link',
      `You sure you want to open this link?\n\n${displayURL}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: onDismiss },
        { text: 'Open', onPress: onConfirm },
      ],
      { cancelable: true, onDismiss },
    );
  }, [setLinkModalActive, messageKey, displayURL, onConfirm, onDismiss]);
}

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +target: string,
  +children: React.Node,
  ...TextProps,
};
function MarkdownLink(props: Props): React.Node {
  const { target, ...rest } = props;

  const markdownContext = React.useContext(MarkdownContext);
  invariant(markdownContext, 'MarkdownContext should be set');

  const textMessageMarkdownContext = React.useContext(
    TextMessageMarkdownContext,
  );
  const messageKey = textMessageMarkdownContext?.messageKey;

  const messagePressResponderContext = React.useContext(
    MessagePressResponderContext,
  );

  const onPressMessage = messagePressResponderContext?.onPressMessage;

  const onPressLink = useDisplayLinkPrompt(target, markdownContext, messageKey);

  return <Text onPress={onPressLink} onLongPress={onPressMessage} {...rest} />;
}

export default MarkdownLink;

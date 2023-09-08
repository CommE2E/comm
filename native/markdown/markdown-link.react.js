// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, Linking } from 'react-native';

import { inviteLinkURL } from 'lib/facts/links.js';

import {
  MarkdownContext,
  type MarkdownContextType,
} from './markdown-context.js';
import { MarkdownSpoilerContext } from './markdown-spoiler-context.js';
import { MessagePressResponderContext } from '../chat/message-press-responder-context.js';
import { TextMessageMarkdownContext } from '../chat/text-message-markdown-context.js';
import { DeepLinksContext } from '../navigation/deep-links-context-provider.react.js';
import Alert from '../utils/alert.js';
import { normalizeURL } from '../utils/url-utils.js';

function useHandleLinkClick(
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

  const deepLinksContext = React.useContext(DeepLinksContext);
  return React.useCallback(() => {
    if (url.startsWith(inviteLinkURL(''))) {
      deepLinksContext?.setCurrentLinkUrl(url);
      return;
    }
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
  }, [
    url,
    messageKey,
    setLinkModalActive,
    displayURL,
    onDismiss,
    onConfirm,
    deepLinksContext,
  ]);
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

  const markdownSpoilerContext = React.useContext(MarkdownSpoilerContext);
  // Since MarkdownSpoilerContext may not be set, we need
  // to default isRevealed to true for when
  // we use the ternary operator in the onPress
  const isRevealed = markdownSpoilerContext?.isRevealed ?? true;

  const textMessageMarkdownContext = React.useContext(
    TextMessageMarkdownContext,
  );
  const messageKey = textMessageMarkdownContext?.messageKey;

  const messagePressResponderContext = React.useContext(
    MessagePressResponderContext,
  );

  const onPressMessage = messagePressResponderContext?.onPressMessage;

  const onPressLink = useHandleLinkClick(target, markdownContext, messageKey);

  return (
    <Text
      onPress={isRevealed ? onPressLink : null}
      onLongPress={isRevealed ? onPressMessage : null}
      {...rest}
    />
  );
}

export default MarkdownLink;

// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Linking } from 'react-native';

import { inviteLinkUrl } from 'lib/facts/links.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import {
  MarkdownContext,
  type MarkdownContextType,
} from './markdown-context.js';
import { MarkdownSpoilerContext } from './markdown-spoiler-context.js';
import { useNavigateToThreadWithFadeAnimation } from '../chat/message-list-types.js';
import { MessagePressResponderContext } from '../chat/message-press-responder-context.js';
import { TextMessageMarkdownContext } from '../chat/text-message-markdown-context.js';
import { InviteLinksContext } from '../invite-links/invite-links-context-provider.react.js';
import Alert from '../utils/alert.js';
import { normalizeURL } from '../utils/url-utils.js';

function useMarkdownOnPressUtils(blockOnPress: boolean = false): {
  markdownContext: MarkdownContextType,
  shouldBePressable: boolean,
  messageKey: ?string,
  onLongPressHandler: ?() => void,
} {
  const markdownContext = React.useContext(MarkdownContext);
  invariant(markdownContext, 'MarkdownContext should be set');

  const markdownSpoilerContext = React.useContext(MarkdownSpoilerContext);
  // Since MarkdownSpoilerContext may not be set, we need
  // to default isRevealed to true for when
  // we use the ternary operator in the onPress
  const isRevealed = markdownSpoilerContext?.isRevealed ?? true;

  const shouldBePressable = blockOnPress ? false : isRevealed;

  const textMessageMarkdownContext = React.useContext(
    TextMessageMarkdownContext,
  );
  const messageKey = textMessageMarkdownContext?.messageKey;

  const messagePressResponderContext = React.useContext(
    MessagePressResponderContext,
  );

  const onLongPressHandler = messagePressResponderContext?.onPressMessage;

  return {
    markdownContext,
    shouldBePressable,
    messageKey,
    onLongPressHandler,
  };
}

function useHandleLinkClick(
  inputURL: string,
  markdownContext: MarkdownContextType,
  messageKey: ?string,
): () => mixed {
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

  const inviteLinksContext = React.useContext(InviteLinksContext);
  return React.useCallback(() => {
    if (url.startsWith(inviteLinkUrl(''))) {
      inviteLinksContext?.setCurrentLinkUrl(url);
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
    inviteLinksContext,
  ]);
}

function useHandleChatMentionClick(
  threadInfo: ThreadInfo,
  markdownContext: MarkdownContextType,
  messageKey: ?string,
): () => mixed {
  const { setLinkModalActive } = markdownContext;
  const navigateToThreadWithFadeAnimation =
    useNavigateToThreadWithFadeAnimation(threadInfo, messageKey);

  return React.useCallback(() => {
    messageKey && setLinkModalActive({ [messageKey]: true });
    navigateToThreadWithFadeAnimation();
    messageKey && setLinkModalActive({ [messageKey]: false });
  }, [messageKey, navigateToThreadWithFadeAnimation, setLinkModalActive]);
}

export {
  useMarkdownOnPressUtils,
  useHandleLinkClick,
  useHandleChatMentionClick,
};

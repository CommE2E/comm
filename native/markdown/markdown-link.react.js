// @flow

import * as React from 'react';
import { Text, Linking, Alert } from 'react-native';

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
  const { target, ...rest } = props;
  const markdownContext = React.useContext(MarkdownContext);
  const onPressLink = useDisplayLinkPrompt(target, markdownContext);
  return <Text onPress={onPressLink} {...rest} />;
}

export default MarkdownLink;

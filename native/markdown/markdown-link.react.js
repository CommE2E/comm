// @flow

import * as React from 'react';
import { Text, Linking, Alert } from 'react-native';

import { normalizeURL } from 'lib/utils/url-utils';

import { MarkdownLinkContext } from './markdown-link-context';

function useDisplayLinkPrompt(inputURL: string) {
  const markdownLinkContext = React.useContext(MarkdownLinkContext);
  const setLinkPressActive = markdownLinkContext?.setLinkPressActive;
  const onDismiss = React.useCallback(() => {
    setLinkPressActive?.(false);
  }, [setLinkPressActive]);

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
    setLinkPressActive && setLinkPressActive(true);
    Alert.alert(
      'External link',
      `You sure you want to open this link?\n\n${displayURL}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: onDismiss },
        { text: 'Open', onPress: onConfirm },
      ],
      { cancelable: true, onDismiss },
    );
  }, [setLinkPressActive, displayURL, onConfirm, onDismiss]);
}

type TextProps = React.ElementConfig<typeof Text>;
type Props = {|
  +target: string,
  +children: React.Node,
  ...TextProps,
|};
function MarkdownLink(props: Props): React.Node {
  const { target, ...rest } = props;
  const onPressLink = useDisplayLinkPrompt(target);
  return <Text onPress={onPressLink} {...rest} />;
}

export default MarkdownLink;

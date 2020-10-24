// @flow

import * as React from 'react';
import { Text, Linking, Alert } from 'react-native';

import { normalizeURL } from 'lib/utils/url-utils';

function displayLinkPrompt(inputURL: string) {
  const url = normalizeURL(inputURL);
  const onConfirm = () => {
    Linking.openURL(url);
  };

  let displayURL = url.substring(0, 64);
  if (url.length > displayURL.length) {
    displayURL += '…';
  }

  Alert.alert(
    'External link',
    `You sure you want to open this link?\n\n${displayURL}`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open', onPress: onConfirm },
    ],
    { cancelable: true },
  );
}

type TextProps = React.ElementConfig<typeof Text>;
type Props = {|
  +target: string,
  +children: React.Node,
  ...TextProps,
|};
function MarkdownLink(props: Props) {
  const { target, ...rest } = props;
  const onPressLink = React.useCallback(() => {
    displayLinkPrompt(target);
  }, [target]);
  return <Text onPress={onPressLink} {...rest} />;
}

export default MarkdownLink;

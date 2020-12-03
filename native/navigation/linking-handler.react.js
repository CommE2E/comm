// @flow

import { CommonActions } from '@react-navigation/native';
import * as React from 'react';
import { Linking } from 'react-native';

import { infoFromURL } from 'lib/utils/url-utils';

import type { NavAction } from './navigation-context';
import { VerificationModalRouteName } from './route-names';

type Props = {|
  dispatch: (action: NavAction) => void,
|};
const LinkingHandler = React.memo<Props>((props: Props) => {
  const { dispatch } = props;

  const handleURL = (url: string) => {
    if (!url.startsWith('http')) {
      return;
    }
    const { verify } = infoFromURL(url);
    if (!verify) {
      // TODO correctly handle non-verify URLs
      return;
    }
    dispatch(
      CommonActions.navigate({
        name: VerificationModalRouteName,
        key: 'VerificationModal',
        params: { verifyCode: verify },
      }),
    );
  };

  React.useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        handleURL(url);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const handleURLChange = (event: { url: string }) => handleURL(event.url);
    Linking.addEventListener('url', handleURLChange);
    return () => Linking.removeEventListener('url', handleURLChange);
  });

  return null;
});
LinkingHandler.displayName = 'LinkingHandler';

export default LinkingHandler;

// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { policyTypes } from 'lib/facts/policies';

import { useSelector } from '../redux/redux-utils';
import { TermsAndPrivacyRouteName } from './route-names';

function PolicyAcknowledgmentHandler(): null {
  const userPolicies = useSelector(state => state.userPolicies);
  const navigation = useNavigation();

  React.useEffect(() => {
    const tosAndPrivacyState = userPolicies?.[policyTypes.tosAndPrivacyPolicy];
    if (tosAndPrivacyState && !tosAndPrivacyState?.isAcknowledged) {
      navigation.navigate<'TermsAndPrivacyModal'>({
        name: TermsAndPrivacyRouteName,
        params: { policyType: policyTypes.tosAndPrivacyPolicy },
      });
    }
  }, [navigation, userPolicies]);

  return null;
}

export default PolicyAcknowledgmentHandler;

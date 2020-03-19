// @flow

import type { AppState } from '../../redux/redux-setup';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../../themes/colors';

export type CategoryType = 'full' | 'outline' | 'unpadded';
type HeaderProps = {|
  type: CategoryType,
  title: string,
  // Redux state
  styles: Styles,
|};
function ThreadSettingsCategoryHeader(props: HeaderProps) {
  let contentStyle, paddingStyle;
  if (props.type === 'full') {
    contentStyle = props.styles.fullHeader;
    paddingStyle = props.styles.fullHeaderPadding;
  } else if (props.type === 'outline') {
  } else if (props.type === 'unpadded') {
    contentStyle = props.styles.fullHeader;
  } else {
    invariant(false, 'invalid ThreadSettingsCategory type');
  }
  return (
    <View>
      <View style={[props.styles.header, contentStyle]}>
        <Text style={props.styles.title}>{props.title.toUpperCase()}</Text>
      </View>
      <View style={paddingStyle} />
    </View>
  );
}

type FooterProps = {|
  type: CategoryType,
  // Redux state
  styles: Styles,
|};
function ThreadSettingsCategoryFooter(props: FooterProps) {
  let contentStyle, paddingStyle;
  if (props.type === 'full') {
    contentStyle = props.styles.fullFooter;
    paddingStyle = props.styles.fullFooterPadding;
  } else if (props.type === 'outline') {
  } else if (props.type === 'unpadded') {
    contentStyle = props.styles.fullFooter;
  } else {
    invariant(false, 'invalid ThreadSettingsCategory type');
  }
  return (
    <View>
      <View style={paddingStyle} />
      <View style={[props.styles.footer, contentStyle]} />
    </View>
  );
}

const paddingHeight = Platform.select({
  android: 6.5,
  default: 6,
});
const styles = {
  header: {
    marginTop: 16,
  },
  footer: {
    marginBottom: 16,
  },
  title: {
    paddingLeft: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: '400',
    color: 'panelBackgroundLabel',
  },
  fullHeader: {
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
  },
  fullHeaderPadding: {
    backgroundColor: 'panelForeground',
    height: paddingHeight,
    margin: 0,
  },
  fullFooter: {
    borderTopWidth: 1,
    borderColor: 'panelForegroundBorder',
  },
  fullFooterPadding: {
    backgroundColor: 'panelForeground',
    height: paddingHeight,
  },
};
const stylesSelector = styleSelector(styles);

const WrappedThreadSettingsCategoryHeader = connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(ThreadSettingsCategoryHeader);

const WrappedThreadSettingsCategoryFooter = connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(ThreadSettingsCategoryFooter);

export {
  WrappedThreadSettingsCategoryHeader as ThreadSettingsCategoryHeader,
  WrappedThreadSettingsCategoryFooter as ThreadSettingsCategoryFooter,
};

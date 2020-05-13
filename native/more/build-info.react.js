// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { persistConfig, codeVersion } from '../redux/persist';
import { styleSelector } from '../themes/colors';

type Props = {|
  // Redux state
  styles: typeof styles,
|};
class BuildInfo extends React.PureComponent<Props> {
  static propTypes = {
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    return (
      <ScrollView
        contentContainerStyle={this.props.styles.scrollViewContentContainer}
        style={this.props.styles.scrollView}
      >
        <View style={this.props.styles.section}>
          <View style={this.props.styles.row}>
            <Text style={this.props.styles.label}>Release</Text>
            <Text style={this.props.styles.releaseText}>ALPHA</Text>
          </View>
          <View style={this.props.styles.row}>
            <Text style={this.props.styles.label}>Code version</Text>
            <Text style={this.props.styles.text}>{codeVersion}</Text>
          </View>
          <View style={this.props.styles.row}>
            <Text style={this.props.styles.label}>State version</Text>
            <Text style={this.props.styles.text}>{persistConfig.version}</Text>
          </View>
        </View>
        <View style={this.props.styles.section}>
          <View style={this.props.styles.row}>
            <Text style={this.props.styles.thanksText}>
              Thank you for helping to test the alpha!
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = {
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    paddingRight: 12,
  },
  releaseText: {
    color: 'redText',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  text: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  thanksText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(BuildInfo);

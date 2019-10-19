// @flow

import type { AppState } from '../redux/redux-setup';
import type { Styles } from '../types/styles';

import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { persistConfig, codeVersion } from '../redux/persist';
import { styleSelector } from '../themes/colors';

type Props = {|
  // Redux state
  styles: Styles,
|};
class BuildInfo extends React.PureComponent<Props> {

  static navigationOptions = {
    headerTitle: "Build info",
  };
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
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollView: {
    backgroundColor: 'background',
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 24,
    marginBottom: 24,
    backgroundColor: 'foreground',
    borderColor: 'foregroundBorder',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 16,
    color: 'foregroundSecondaryLabel',
    paddingRight: 12,
  },
  releaseText: {
    fontSize: 16,
    color: 'red',
  },
  text: {
    fontSize: 16,
    color: 'foregroundLabel',
  },
  thanksText: {
    flex: 1,
    fontSize: 16,
    color: 'foregroundLabel',
    textAlign: 'center',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(BuildInfo);

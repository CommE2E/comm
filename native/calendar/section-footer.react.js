// @flow

import PropTypes from 'prop-types';
import * as React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import type { AppState } from '../redux/redux-setup';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';

type Props = {|
  dateString: string,
  onAdd: (dateString: string) => void,
  onPressWhitespace: () => void,
  // Redux state
  colors: Colors,
  styles: typeof styles,
|};
class SectionFooter extends React.PureComponent<Props> {
  static propTypes = {
    dateString: PropTypes.string.isRequired,
    onAdd: PropTypes.func.isRequired,
    onPressWhitespace: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;
    return (
      <TouchableWithoutFeedback onPress={this.props.onPressWhitespace}>
        <View style={this.props.styles.sectionFooter}>
          <Button
            onPress={this.onSubmit}
            iosFormat="highlight"
            iosHighlightUnderlayColor={underlayColor}
            iosActiveOpacity={0.85}
            style={this.props.styles.addButton}
          >
            <View style={this.props.styles.addButtonContents}>
              <Icon name="plus" style={this.props.styles.addIcon} />
              <Text style={this.props.styles.actionLinksText}>Add</Text>
            </View>
          </Button>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  onSubmit = () => {
    this.props.onAdd(this.props.dateString);
  };
}

const styles = {
  actionLinksText: {
    color: 'listSeparatorLabel',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: 'listSeparator',
    borderRadius: 5,
    margin: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
  },
  addButtonContents: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  addIcon: {
    color: 'listSeparatorLabel',
    fontSize: 14,
    paddingRight: 6,
  },
  sectionFooter: {
    alignItems: 'flex-start',
    backgroundColor: 'listBackground',
    height: 40,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(SectionFooter);

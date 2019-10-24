// @flow

import type { AppState } from '../redux/redux-setup';
import type { Styles } from '../types/styles';
import type { Colors } from '../themes/colors';

import * as React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import { colorsSelector, styleSelector } from '../themes/colors';

type Props = {|
  dateString: string,
  onAdd: (dateString: string) => void,
  onPressWhitespace: () => void,
  // Redux state
  colors: Colors,
  styles: Styles,
|};
class SectionFooter extends React.PureComponent<Props> {

  static propTypes = {
    dateString: PropTypes.string.isRequired,
    onAdd: PropTypes.func.isRequired,
    onPressWhitespace: PropTypes.func.isRequired,
    colors: PropTypes.objectOf(PropTypes.string).isRequired,
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
  }

}

const styles = {
  sectionFooter: {
    backgroundColor: 'listBackground',
    height: 40,
    alignItems: 'flex-start',
  },
  addButton: {
    backgroundColor: 'listSeparator',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 5,
    margin: 5,
  },
  addButtonContents: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 14,
    paddingRight: 6,
    color: 'listSeparatorLabel',
  },
  actionLinksText: {
    fontWeight: 'bold',
    color: 'listSeparatorLabel',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(SectionFooter);

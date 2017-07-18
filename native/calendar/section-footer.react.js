// @flow

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';

import Button from '../components/button.react';

class SectionFooter extends React.PureComponent {

  props: {
    dateString: string,
    onAdd: (dateString: string) => void,
  };
  static propTypes = {
    dateString: PropTypes.string.isRequired,
    onAdd: PropTypes.func.isRequired,
  };

  render() {
    return (
      <View style={styles.sectionFooter}>
        <Button onSubmit={this.onSubmit} style={styles.addButton}>
          <View style={styles.addButtonContents}>
            <Icon name="plus" style={styles.addIcon} />
            <Text style={styles.actionLinksText}>Add</Text>
          </View>
        </Button>
      </View>
    );
  }

  onSubmit = () => {
    this.props.onAdd(this.props.dateString);
  }

}

const styles = StyleSheet.create({
  sectionFooter: {
    backgroundColor: 'white',
    height: 40,
  },
  addButton: {
    position: 'absolute',
    backgroundColor: '#EEEEEE',
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
    color: '#555555',
  },
  actionLinksText: {
    fontWeight: 'bold',
    color: '#555555',
  },
});

export default SectionFooter;

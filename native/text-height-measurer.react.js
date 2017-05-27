// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import React from 'react';
import PropTypes from 'prop-types';
import { Text, View, StyleSheet } from 'react-native';
import invariant from 'invariant';
import _isEmpty from 'lodash/fp/isEmpty';

const measureBatchSize = 50;

type TextToHeight = { [text: string]: number };
type Props = {
  textToMeasure: string[],
  allHeightsMeasuredCallback: (
    textToMeasure: string[],
    heights: TextToHeight,
  ) => void,
  minHeight?: number,
  style: StyleObj,
};
type State = {
  currentlyMeasuring: ?Set<string>,
};
class TextHeightMeasurer extends React.PureComponent {

  props: Props;
  state: State = {
    currentlyMeasuring: null,
  };
  static propTypes = {
    textToMeasure: PropTypes.arrayOf(PropTypes.string).isRequired,
    allHeightsMeasuredCallback: PropTypes.func.isRequired,
    minHeight: PropTypes.number,
    style: Text.propTypes.style,
  };

  currentTextToHeight: TextToHeight = {};
  nextTextToHeight: ?TextToHeight = null;
  leftToMeasure: Set<string> = new Set();
  leftInBatch = 0;

  componentDidMount() {
    this.resetInternalState(this.props.textToMeasure);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.textToMeasure !== this.props.textToMeasure) {
      this.resetInternalState(nextProps.textToMeasure);
    }
  }

  // resets this.leftToMeasure and this.nextTextToHeight
  resetInternalState(newTextToMeasure: string[]) {
    this.leftToMeasure = new Set();
    const nextNextTextToHeight = {};
    for (let text of newTextToMeasure) {
      if (this.currentTextToHeight[text]) {
        nextNextTextToHeight[text] = this.currentTextToHeight[text];
      } else if (this.nextTextToHeight && this.nextTextToHeight[text]) {
        nextNextTextToHeight[text] = this.nextTextToHeight[text];
      } else {
        this.leftToMeasure.add(text);
      }
    }
    this.nextTextToHeight = nextNextTextToHeight;
    if (this.leftToMeasure.size === 0) {
      this.done(newTextToMeasure);
    } else {
      this.newBatch();
    }
  }

  onTextLayout(
    text: string,
    event: { nativeEvent: { layout: { height: number }}},
  ) {
    invariant(this.nextTextToHeight, "nextTextToHeight should be set");
    this.nextTextToHeight[text] =
      this.props.minHeight !== undefined && this.props.minHeight !== null
        ? Math.max(event.nativeEvent.layout.height, this.props.minHeight)
        : event.nativeEvent.layout.height;
    this.leftToMeasure.delete(text);
    this.leftInBatch--;
    if (this.leftToMeasure.size === 0) {
      this.done(this.props.textToMeasure);
    } else if (this.leftInBatch === 0) {
      this.newBatch();
    }
  }

  done(textToMeasure: string[]) {
    invariant(this.leftToMeasure.size === 0, "should be 0 left to measure");
    invariant(this.leftInBatch === 0, "batch should be complete");
    invariant(this.nextTextToHeight, "nextTextToHeight should be set");
    this.currentTextToHeight = this.nextTextToHeight;
    this.nextTextToHeight = null;
    this.props.allHeightsMeasuredCallback(
      textToMeasure,
      this.currentTextToHeight,
    );
    this.setState({ currentlyMeasuring: null });
  }

  newBatch() {
    let newBatchSize = Math.min(measureBatchSize, this.leftToMeasure.size);
    this.leftInBatch = newBatchSize;
    const newCurrentlyMeasuring = new Set();
    const leftToMeasureIter = this.leftToMeasure.values();
    for (; newBatchSize > 0; newBatchSize--) {
      const value = leftToMeasureIter.next().value;
      invariant(value !== undefined && value !== null, "item should exist");
      newCurrentlyMeasuring.add(value);
    }
    this.setState({ currentlyMeasuring: newCurrentlyMeasuring });
  }

  render() {
    const set = this.state.currentlyMeasuring;
    if (_isEmpty(set)) {
      return null;
    }
    invariant(set, "should be set");
    const dummies = Array.from(set).map((text: string) => (
      <Text
        style={[styles.text, this.props.style]}
        onLayout={(event) => this.onTextLayout(text, event)}
        key={text}
      >
        {text}
      </Text>
    ));
    return <View>{dummies}</View>;
  }

}

const styles = StyleSheet.create({
  text: {
    opacity: 0,
    position: 'absolute',
  },
});

export default TextHeightMeasurer;

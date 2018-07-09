// @flow

import type { TextStyle } from './types/styles';

import React from 'react';
import PropTypes from 'prop-types';
import { Text, View, StyleSheet, Platform } from 'react-native';
import invariant from 'invariant';
import _isEmpty from 'lodash/fp/isEmpty';
import _intersectionWith from 'lodash/fp/intersectionWith';
import _differenceWith from 'lodash/fp/differenceWith';
import _isEqual from 'lodash/fp/isEqual';

const measureBatchSize = 50;

export type TextToMeasure = {
  id: string,
  text: string,
  style?: TextStyle,
};
type TextToHeight = Map<string, number>;
type Props = {
  textToMeasure: TextToMeasure[],
  allHeightsMeasuredCallback: (
    textToMeasure: TextToMeasure[],
    heights: TextToHeight,
  ) => void,
  minHeight?: number,
  style?: TextStyle,
};
type State = {
  currentlyMeasuring: ?Set<TextToMeasure>,
};
class TextHeightMeasurer extends React.PureComponent<Props, State> {

  state = {
    currentlyMeasuring: null,
  };
  static propTypes = {
    textToMeasure: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
      style: Text.propTypes.style,
    })).isRequired,
    allHeightsMeasuredCallback: PropTypes.func.isRequired,
    minHeight: PropTypes.number,
    style: Text.propTypes.style,
  };

  currentTextToHeight: TextToHeight = new Map();
  nextTextToHeight: ?TextToHeight = null;
  leftToMeasure: Set<TextToMeasure> = new Set();
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
  resetInternalState(nextTextToMeasure: TextToMeasure[]) {
    this.leftToMeasure = new Set();
    const nextNextTextToHeight = new Map();

    const newTextToMeasure =
      _differenceWith(_isEqual)(nextTextToMeasure)(this.props.textToMeasure);
    for (let textToMeasure of newTextToMeasure) {
      this.leftToMeasure.add(textToMeasure);
    }

    const existingTextToMeasure =
      _intersectionWith(_isEqual)(nextTextToMeasure)(this.props.textToMeasure);
    for (let textToMeasure of existingTextToMeasure) {
      const id = textToMeasure.id;
      const existingTextToHeight = this.nextTextToHeight
        ? this.nextTextToHeight
        : this.currentTextToHeight;
      const measuredHeight = existingTextToHeight.get(id);
      if (measuredHeight !== undefined) {
        nextNextTextToHeight.set(id, measuredHeight);
      } else {
        this.leftToMeasure.add(textToMeasure);
      }
    }

    this.nextTextToHeight = nextNextTextToHeight;
    if (this.leftToMeasure.size === 0) {
      this.done(nextTextToMeasure);
    } else {
      this.newBatch();
    }
  }

  onTextLayout(
    textToMeasure: TextToMeasure,
    event: { nativeEvent: { layout: { height: number }}},
  ) {
    invariant(this.nextTextToHeight, "nextTextToHeight should be set");
    this.nextTextToHeight.set(
      textToMeasure.id,
      this.props.minHeight !== undefined && this.props.minHeight !== null
        ? Math.max(event.nativeEvent.layout.height, this.props.minHeight)
        : event.nativeEvent.layout.height,
    );
    this.leftToMeasure.delete(textToMeasure);
    this.leftInBatch--;
    if (this.leftToMeasure.size === 0) {
      this.done(this.props.textToMeasure);
    } else if (this.leftInBatch === 0) {
      this.newBatch();
    }
  }

  done(textToMeasure: TextToMeasure[]) {
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
    const dummies = Array.from(set).map((textToMeasure: TextToMeasure) => {
      const style = textToMeasure.style ? textToMeasure.style : this.props.style;
      invariant(style, "style should exist for every text being measured!");
      let text = textToMeasure.text;
      if (
        Platform.OS === "android" &&
        (text === "" || text.slice(-1) === "\n")
      ) {
        text += " ";
      }
      return (
        <Text
          style={[styles.text, style]}
          onLayout={(event) => this.onTextLayout(textToMeasure, event)}
          key={textToMeasure.id}
        >
          {text}
        </Text>
      );
    });
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

// @flow

import type { LayoutEvent } from '../types/react-native';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import invariant from 'invariant';
import _isEmpty from 'lodash/fp/isEmpty';
import _intersectionWith from 'lodash/fp/intersectionWith';
import _differenceWith from 'lodash/fp/differenceWith';
import _isEqual from 'lodash/fp/isEqual';

const measureBatchSize = 50;

export type NodeToMeasure = {|
  +id: string,
  +node: React.Element<any>,
|};
type NodesToHeight = Map<string, number>;
type Props = {|
  +nodesToMeasure: NodeToMeasure[],
  +allHeightsMeasuredCallback: (
    nodesToMeasure: $ReadOnlyArray<NodeToMeasure>,
    heights: NodesToHeight,
  ) => void,
  +minHeight?: number,
|};
type State = {|
  +currentlyMeasuring: ?Set<NodeToMeasure>,
|};
class NodeHeightMeasurer extends React.PureComponent<Props, State> {
  state = {
    currentlyMeasuring: null,
  };
  static propTypes = {
    nodesToMeasure: PropTypes.arrayOf(
      PropTypes.exact({
        id: PropTypes.string.isRequired,
        node: PropTypes.element.isRequired,
      }),
    ).isRequired,
    allHeightsMeasuredCallback: PropTypes.func.isRequired,
    minHeight: PropTypes.number,
  };

  currentNodesToHeight: NodesToHeight = new Map();
  nextNodesToHeight: ?NodesToHeight = null;
  leftToMeasure: Set<NodeToMeasure> = new Set();
  leftInBatch = 0;

  componentDidMount() {
    this.resetInternalState(this.props.nodesToMeasure);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.nodesToMeasure !== prevProps.nodesToMeasure) {
      this.resetInternalState(prevProps.nodesToMeasure);
    }
  }

  // resets this.leftToMeasure and this.nextNodesToHeight
  resetInternalState(prevNodesToMeasure: NodeToMeasure[]) {
    this.leftToMeasure = new Set();
    const nextNextNodesToHeight = new Map();
    const nextNodesToMeasure = this.props.nodesToMeasure;

    const newNodesToMeasure = _differenceWith(_isEqual)(nextNodesToMeasure)(
      prevNodesToMeasure,
    );
    for (let nodeToMeasure of newNodesToMeasure) {
      this.leftToMeasure.add(nodeToMeasure);
    }

    const existingNodesToHeight = this.nextNodesToHeight
      ? this.nextNodesToHeight
      : this.currentNodesToHeight;
    const existingNodesToMeasure = _intersectionWith(_isEqual)(
      nextNodesToMeasure,
    )(prevNodesToMeasure);
    for (let nodeToMeasure of existingNodesToMeasure) {
      const { id } = nodeToMeasure;
      const measuredHeight = existingNodesToHeight.get(id);
      if (measuredHeight !== undefined) {
        nextNextNodesToHeight.set(id, measuredHeight);
      } else {
        this.leftToMeasure.add(nodeToMeasure);
      }
    }

    this.nextNodesToHeight = nextNextNodesToHeight;
    if (this.leftToMeasure.size === 0) {
      this.done(nextNodesToMeasure);
    } else {
      this.newBatch();
    }
  }

  onLayout(nodeToMeasure: NodeToMeasure, event: LayoutEvent) {
    invariant(this.nextNodesToHeight, 'nextNodesToHeight should be set');
    this.nextNodesToHeight.set(
      nodeToMeasure.id,
      this.props.minHeight !== undefined && this.props.minHeight !== null
        ? Math.max(event.nativeEvent.layout.height, this.props.minHeight)
        : event.nativeEvent.layout.height,
    );
    this.leftToMeasure.delete(nodeToMeasure);
    this.leftInBatch--;
    if (this.leftToMeasure.size === 0) {
      this.done(this.props.nodesToMeasure);
    } else if (this.leftInBatch === 0) {
      this.newBatch();
    }
  }

  done(nodesToMeasure: NodeToMeasure[]) {
    invariant(this.leftToMeasure.size === 0, 'should be 0 left to measure');
    invariant(this.nextNodesToHeight, 'nextNodesToHeight should be set');
    this.currentNodesToHeight = this.nextNodesToHeight;
    this.nextNodesToHeight = null;
    this.props.allHeightsMeasuredCallback(
      nodesToMeasure,
      this.currentNodesToHeight,
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
      invariant(value !== undefined && value !== null, 'item should exist');
      newCurrentlyMeasuring.add(value);
    }
    this.setState({ currentlyMeasuring: newCurrentlyMeasuring });
  }

  render() {
    const set = this.state.currentlyMeasuring;
    if (_isEmpty(set)) {
      return null;
    }
    invariant(set, 'should be set');
    const dummies = Array.from(set).map((nodeToMeasure: NodeToMeasure) => {
      let { children } = nodeToMeasure.node.props;
      if (children === '') {
        children = ' ';
      }
      const style = [nodeToMeasure.node.props.style, styles.text];
      const onLayout = event => this.onLayout(nodeToMeasure, event);
      const node = React.cloneElement(nodeToMeasure.node, {
        style,
        onLayout,
        children,
      });

      return <React.Fragment key={nodeToMeasure.id}>{node}</React.Fragment>;
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

export default NodeHeightMeasurer;

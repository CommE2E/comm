// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  ViewPropTypes,
  Platform,
} from 'react-native';
import invariant from 'invariant';

const windowWidth = Dimensions.get('window').width;
const defaultInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  placeholder: 'username',
  returnKeyType: 'done',
  keyboardType: 'default',
  underlineColorAndroid: 'rgba(0,0,0,0)',
};
const defaultProps = {
  tagColor: '#dddddd',
  tagTextColor: '#777777',
  inputColor: '#777777',
  maxHeight: 75,
};

const tagDataPropType = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.object,
]);
type Props<TagData> = {
  // The text currently being displayed as the user types
  text: string,
  // Callback to update the text being displayed
  setText: (text: string) => void,
  // A handler to be called when array of tags change
  onChange: (items: $ReadOnlyArray<TagData>) => void,
  // An array of tags
  value: $ReadOnlyArray<TagData>,
  // Background color of tags
  tagColor: string,
  // Text color of tags
  tagTextColor: string,
  // Styling override for container surrounding tag text
  tagContainerStyle?: StyleObj,
  // Styling overrride for tag's text component
  tagTextStyle?: StyleObj,
  // Color of text input
  inputColor: string,
  // TextInput props Text.propTypes
  inputProps?: $PropertyType<Text, 'props'>,
  // path of the label in tags objects
  labelExtractor?: (tagData: TagData) => string,
  // maximum height of this component
  maxHeight: number,
  // callback that gets triggered when the component height changes
  onHeightChange: ?(height: number) => void,
};
type State = {
  inputWidth: number,
  wrapperHeight: number,
};
class TagInput<TagData> extends React.PureComponent<
  typeof defaultProps,
  Props<TagData>,
  State,
> {

  static propTypes = {
    text: PropTypes.string.isRequired,
    setText: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.arrayOf(tagDataPropType).isRequired,
    tagColor: PropTypes.string,
    tagTextColor: PropTypes.string,
    tagContainerStyle: ViewPropTypes.style,
    tagTextStyle: Text.propTypes.style,
    inputColor: PropTypes.string,
    inputProps: PropTypes.object,
    labelExtractor: PropTypes.func,
    maxHeight: PropTypes.number,
    onHeightChange: PropTypes.func,
  };
  props: Props<TagData>;
  state: State = {
    inputWidth: 90,
    wrapperHeight: 36,
  };
  wrapperWidth = windowWidth;
  spaceLeft = 0;
  // scroll to bottom
  contentHeight = 0;
  scrollViewHeight = 0;
  // refs
  tagInput: ?TextInput = null;
  scrollView: ?ScrollView = null;

  static defaultProps = defaultProps;

  static inputWidth(text: string, spaceLeft: number, wrapperWidth: number) {
    if (text === "") {
      return 90;
    } else if (spaceLeft >= 100) {
      return spaceLeft - 10;
    } else {
      return wrapperWidth;
    }
  }

  componentWillReceiveProps(nextProps: Props<TagData>) {
    const inputWidth = TagInput.inputWidth(
      nextProps.text,
      this.spaceLeft,
      this.wrapperWidth,
    );
    if (inputWidth !== this.state.inputWidth) {
      this.setState({ inputWidth });
    }
  }

  componentWillUpdate(nextProps: Props<TagData>, nextState: State) {
    if (
      this.props.onHeightChange &&
      nextState.wrapperHeight !== this.state.wrapperHeight
    ) {
      this.props.onHeightChange(nextState.wrapperHeight);
    }
  }

  measureWrapper = (event: { nativeEvent: { layout: { width: number } } }) => {
    this.wrapperWidth = event.nativeEvent.layout.width;
    const inputWidth = TagInput.inputWidth(
      this.props.text,
      this.spaceLeft,
      this.wrapperWidth,
    );
    if (inputWidth !== this.state.inputWidth) {
      this.setState({ inputWidth });
    }
  }

  onChangeText = (text: string) => {
    this.props.setText(text);
  }

  onBlur = (event: { nativeEvent: { text: string } }) => {
    invariant(Platform.OS === "ios", "only iOS gets text on TextInput.onBlur");
    this.props.setText(event.nativeEvent.text);
  }

  onKeyPress = (event: { nativeEvent: { key: string } }) => {
    if (this.props.text !== '' || event.nativeEvent.key !== 'Backspace') {
      return;
    }
    const tags = [...this.props.value];
    tags.pop();
    this.props.onChange(tags);
    this.focus();
  }

  focus = () => {
    if (this.tagInput) {
      this.tagInput.focus();
    }
  }

  removeIndex = (index: number) => {
    const tags = [...this.props.value];
    tags.splice(index, 1);
    this.props.onChange(tags);
  }

  scrollToBottom = () => {
    const y = this.contentHeight - this.scrollViewHeight;
    if (y <= 0) {
      return;
    }
    const scrollView = this.scrollView;
    invariant(
      scrollView,
      "this.scrollView ref should exist before scrollToBottom called",
    );
    scrollView.scrollTo({ y, animated: true });
  }

  render() {
    const inputProps = { ...defaultInputProps, ...this.props.inputProps };

    const inputWidth = this.state.inputWidth;

    const tags = this.props.value.map((tag, index) => (
      <Tag
        index={index}
        tag={tag}
        isLastTag={this.props.value.length === index + 1}
        onLayoutLastTag={this.onLayoutLastTag}
        removeIndex={this.removeIndex}
        labelExtractor={this.props.labelExtractor}
        tagColor={this.props.tagColor}
        tagTextColor={this.props.tagTextColor}
        tagContainerStyle={this.props.tagContainerStyle}
        tagTextStyle={this.props.tagTextStyle}
        key={index}
      />
    ));

    return (
      <TouchableWithoutFeedback
        onPress={this.focus}
        style={[styles.container]}
        onLayout={this.measureWrapper}
      >
        <View
          style={[styles.wrapper, { height: this.state.wrapperHeight }]}
        >
          <ScrollView
            ref={this.scrollViewRef}
            style={styles.tagInputContainerScroll}
            onContentSizeChange={this.onScrollViewContentSizeChange}
            onLayout={this.onScrollViewLayout}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tagInputContainer}>
              {tags}
              <View style={[
                styles.textInputContainer,
                { width: inputWidth },
              ]}>
                <TextInput
                  ref={this.tagInputRef}
                  blurOnSubmit={false}
                  onKeyPress={this.onKeyPress}
                  value={this.props.text}
                  style={[
                    styles.textInput,
                    { width: inputWidth, color: this.props.inputColor },
                  ]}
                  onBlur={Platform.OS === "ios" ? this.onBlur : undefined}
                  onChangeText={this.onChangeText}
                  {...inputProps}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    )
  }

  tagInputRef = (tagInput: TextInput) => {
    this.tagInput = tagInput;
  }

  scrollViewRef = (scrollView: ScrollView) => {
    this.scrollView = scrollView;
  }

  onScrollViewContentSizeChange = (w: number, h: number) => {
    if (this.contentHeight === h) {
      return;
    }
    const nextWrapperHeight = h > this.props.maxHeight
      ? this.props.maxHeight
      : h;
    if (nextWrapperHeight !== this.state.wrapperHeight) {
      this.setState(
        { wrapperHeight: nextWrapperHeight },
        this.contentHeight < h ? this.scrollToBottom : undefined,
      );
    } else if (this.contentHeight < h) {
      this.scrollToBottom();
    }
    this.contentHeight = h;
  }

  onScrollViewLayout = (
    event: { nativeEvent: { layout: { height: number } } },
  ) => {
    this.scrollViewHeight = event.nativeEvent.layout.height;
  }

  onLayoutLastTag = (endPosOfTag: number) => {
    const margin = 3;
    this.spaceLeft = this.wrapperWidth - endPosOfTag - margin - 10;
    const inputWidth = TagInput.inputWidth(
      this.props.text,
      this.spaceLeft,
      this.wrapperWidth,
    );
    if (inputWidth !== this.state.inputWidth) {
      this.setState({ inputWidth });
    }
  }

}

type TagProps<TagData> = {
  index: number,
  tag: TagData,
  isLastTag: bool,
  onLayoutLastTag: (endPosOfTag: number) => void,
  removeIndex: (index: number) => void,
  labelExtractor?: (tagData: TagData) => string,
  tagColor: string,
  tagTextColor: string,
  tagContainerStyle?: StyleObj,
  tagTextStyle?: StyleObj,
};
class Tag<TagData> extends React.PureComponent<void, TagProps<TagData>, void> {

  props: TagProps<TagData>;
  static propTypes = {
    index: PropTypes.number.isRequired,
    tag: tagDataPropType.isRequired,
    isLastTag: PropTypes.bool.isRequired,
    onLayoutLastTag: PropTypes.func.isRequired,
    removeIndex: PropTypes.func.isRequired,
    labelExtractor: PropTypes.func,
    tagColor: PropTypes.string.isRequired,
    tagTextColor: PropTypes.string.isRequired,
    tagContainerStyle: ViewPropTypes.style,
    tagTextStyle: Text.propTypes.style,
  };
  curPos: ?number = null;

  componentWillReceiveProps(nextProps: TagProps<TagData>) {
    if (
      !this.props.isLastTag &&
      nextProps.isLastTag &&
      this.curPos !== null &&
      this.curPos !== undefined
    ) {
      this.props.onLayoutLastTag(this.curPos);
    }
  }

  render() {
    return (
      <TouchableOpacity
        onPress={this.onPress}
        onLayout={this.onLayoutLastTag}
        style={[
          styles.tag,
          { backgroundColor: this.props.tagColor },
          this.props.tagContainerStyle,
        ]}
      >
        <Text style={[
          styles.tagText,
          { color: this.props.tagTextColor },
          this.props.tagTextStyle,
        ]}>
          {this.getLabelValue()}
          &nbsp;&times;
        </Text>
      </TouchableOpacity>
    );
  }

  onPress = () => {
    this.props.removeIndex(this.props.index);
  }

  onLayoutLastTag = (
    event: { nativeEvent: { layout: { x: number, width: number } } },
  ) => {
    const layout = event.nativeEvent.layout;
    this.curPos = layout.width + layout.x;
    if (this.props.isLastTag) {
      this.props.onLayoutLastTag(this.curPos);
    }
  }

  getLabelValue = () => {
    const { tag, labelExtractor } = this.props;
    return labelExtractor && typeof tag !== "string"
      ? labelExtractor(tag)
      : tag;
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
  },
  tagInputContainerScroll: {
    flex: 1,
  },
  tagInputContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  textInput: {
    fontSize: 18,
    flex: .6,
    padding: 0,
    marginTop: 3,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  textInputContainer: {
  },
  tag: {
    justifyContent: 'center',
    marginTop: 3,
    marginRight: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  tagText: {
    padding: 0,
    margin: 0,
    fontSize: 16,
  },
});

export default TagInput;

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
} from 'react-native';
import invariant from 'invariant';

const windowWidth = Dimensions.get('window').width;

type TagData = string | {[key: string]: string};
const tagDataPropType = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.object,
]);

type Props = {
  // The text currently being displayed as the user types
  text: string,
  // Callback to update the text being displayed
  setText: (text: string) => void,
  // A handler to be called when array of tags change
  onChange: (items: $ReadOnlyArray<TagData>) => void,
  // An array of tags
  value: $ReadOnlyArray<TagData>,
  // An array os characters to use as tag separators
  separators?: $ReadOnlyArray<string>,
  // A RegExp to test tags after enter, space, or a comma is pressed
  regex?: RegExp,
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
  labelKey?: string,
  // maximum number of lines of this component
  numberOfLines: number,
};

type State = {
  inputWidth: ?number,
  lines: number,
};

const DEFAULT_SEPARATORS = [',', ' ', ';', '\n'];
const DEFAULT_TAG_REGEX = /(.+)/gi;

class TagInput extends React.PureComponent {

  static propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.arrayOf(tagDataPropType).isRequired,
    separators: PropTypes.arrayOf(PropTypes.string),
    regex: PropTypes.object,
    tagColor: PropTypes.string,
    tagTextColor: PropTypes.string,
    tagContainerStyle: ViewPropTypes.style,
    tagTextStyle: Text.propTypes.style,
    inputColor: PropTypes.string,
    inputProps: PropTypes.object,
    labelKey: PropTypes.string,
    numberOfLines: PropTypes.number,
  };
  props: Props;
  state: State = {
    inputWidth: null,
    lines: 1,
  };
  wrapperWidth = windowWidth;
  // scroll to bottom
  contentHeight = 0;
  scrollViewHeight = 0;
  // refs
  tagInput: ?TextInput = null;
  scrollView: ?ScrollView = null;

  static defaultProps = {
    tagColor: '#dddddd',
    tagTextColor: '#777777',
    inputColor: '#777777',
    numberOfLines: 2,
  };

  measureWrapper = (event: { nativeEvent: { layout: { width: number } } }) => {
    this.wrapperWidth = event.nativeEvent.layout.width;
    this.setState({ inputWidth: this.wrapperWidth });
  }

  onChangeText = (text: string) => {
    this.props.setText(text);
    const lastTyped = text.charAt(text.length - 1);

    const parseWhen = this.props.separators || DEFAULT_SEPARATORS;

    if (parseWhen.indexOf(lastTyped) > -1) {
      this.parseTags(text);
    }
  }

  onBlur = (event: { nativeEvent: { text: string } }) => {
    const text = event.nativeEvent.text;
    this.props.setText(text);
    if (this.props.parseOnBlur) {
      this.parseTags(text);
    }
  }

  parseTags = (text: ?string) => {
    text = text ? text : this.props.text;

    const { value } = this.props;

    const regex = this.props.regex || DEFAULT_TAG_REGEX;
    const results = text.match(regex);

    if (results && results.length > 0) {
      this.props.setText('');
      this.props.onChange([...new Set([...value, ...results])]);
    }
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
    const { inputWidth, lines } = this.state;
    const { inputColor } = this.props;

    const defaultInputProps = {
      autoCapitalize: 'none',
      autoCorrect: false,
      placeholder: 'username',
      returnKeyType: 'done',
      keyboardType: 'default',
      underlineColorAndroid: 'rgba(0,0,0,0)',
    }

    const inputProps = { ...defaultInputProps, ...this.props.inputProps };

    const wrapperHeight = (lines - 1) * 40 + 36;

    const width = inputWidth ? inputWidth : 400;

    const tags = this.props.value.map((tag, index) => (
      <Tag
        index={index}
        tag={tag}
        isLastTag={this.props.value.length === index + 1}
        onLayoutLastTag={this.onLayoutLastTag}
        removeIndex={this.removeIndex}
        labelKey={this.props.labelKey}
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
          style={[styles.wrapper, { height: wrapperHeight }]}
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
                { width: this.state.inputWidth },
              ]}>
                <TextInput
                  ref={this.tagInputRef}
                  blurOnSubmit={false}
                  onKeyPress={this.onKeyPress}
                  value={this.props.text}
                  style={[styles.textInput, {
                    width: width,
                    color: inputColor,
                  }]}
                  onBlur={this.onBlur}
                  onChangeText={this.onChangeText}
                  onSubmitEditing={this.parseTags}
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
    this.contentHeight = h;
  }

  onScrollViewLayout = (
    event: { nativeEvent: { layout: { height: number } } },
  ) => {
    this.scrollViewHeight = event.nativeEvent.layout.height;
  }

  onLayoutLastTag = (endPosOfTag: number) => {
    const margin = 3;
    const spaceLeft = this.wrapperWidth - endPosOfTag - margin - 10;

    const inputWidth = (spaceLeft < 100) ? this.wrapperWidth : spaceLeft - 10;

    if (spaceLeft < 100) {
      if (this.state.lines < this.props.numberOfLines) {
        const lines = this.state.lines + 1;

        this.setState({ inputWidth, lines });
      } else {
        this.setState({ inputWidth }, this.scrollToBottom);
      }
    } else {
      this.setState({ inputWidth });
    }
  }

}

type TagProps = {
  index: number,
  tag: TagData,
  isLastTag: bool,
  onLayoutLastTag: (endPosOfTag: number) => void,
  removeIndex: (index: number) => void,
  labelKey?: string,
  tagColor: string,
  tagTextColor: string,
  tagContainerStyle?: StyleObj,
  tagTextStyle?: StyleObj,
};
class Tag extends React.PureComponent {

  props: TagProps;
  static propTypes = {
    index: PropTypes.number.isRequired,
    tag: tagDataPropType.isRequired,
    isLastTag: PropTypes.bool.isRequired,
    onLayoutLastTag: PropTypes.func.isRequired,
    removeIndex: PropTypes.func.isRequired,
    labelKey: PropTypes.string,
    tagColor: PropTypes.string.isRequired,
    tagTextColor: PropTypes.string.isRequired,
    tagContainerStyle: ViewPropTypes.style,
    tagTextStyle: Text.propTypes.style,
  };
  curPos: ?number = null;

  componentWillReceiveProps(nextProps: TagProps) {
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
    const { tag, labelKey } = this.props;
    if (labelKey) {
      if (typeof tag !== "string" && labelKey in tag) {
        return tag[labelKey];
      }
    }
    return tag;
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

export { DEFAULT_SEPARATORS, DEFAULT_TAG_REGEX }

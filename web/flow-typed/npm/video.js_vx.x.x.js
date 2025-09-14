// flow-typed signature: 19d5fea5ee5057fdfed3ab2bd33320d2
// flow-typed version: <<STUB>>/video.js_v8.x.x/flow_v0.269.1

declare module 'video.js' {
  declare export type PlayerReadyCallback = (player: Player) => void;

  declare export type VideoJsOptions = {
    // Standard HTML5 video element options
    autoplay?: boolean | 'play' | 'muted' | 'any',
    controls?: boolean,
    height?: number | string,
    loop?: boolean,
    muted?: boolean,
    poster?: ?string,
    preload?: 'auto' | 'metadata' | 'none',
    src?: string,
    width?: number | string,

    // Video.js specific options
    aspectRatio?: string,
    audioOnlyMode?: boolean,
    audioPosterMode?: boolean,
    autoSetup?: boolean,
    breakpoints?: {
      tiny?: number,
      xsmall?: number,
      small?: number,
      medium?: number,
      large?: number,
      xlarge?: number,
      huge?: number,
      ...
    },
    fluid?: boolean,
    fullscreen?: {
      options?: {
        navigationUI?: string,
        ...
      },
      ...
    },
    inactivityTimeout?: number,
    language?: string,
    languages?: { [langCode: string]: { [key: string]: string, ... }, ... },
    liveui?: boolean,
    playbackRates?: Array<number>,
    playsinline?: boolean,
    plugins?: { [pluginName: string]: any, ... },
    responsive?: boolean,
    sources?: Array<SourceObject>,
    techOrder?: Array<string>,
    userActions?: {
      click?: boolean | ((event: Event) => void),
      doubleClick?: boolean | ((event: Event) => void),
      hotkeys?:
        | boolean
        | {
            volumeStep?: number,
            seekStep?: number,
            enableModifiersForNumbers?: boolean,
            enableVolumeScroll?: boolean,
            enableHoverScroll?: boolean,
            enableFullscreenToggle?: boolean,
            ...
          },
      ...
    },
    volume?: number,
    ...
  };

  declare export type SourceObject = {
    src: string,
    type?: string,
    ...
  };

  declare export type TimeRange = {
    length: number,
    start(index: number): number,
    end(index: number): number,
    ...
  };

  declare export type MediaError = {
    code: number,
    message: string,
    ...
  };

  declare export type TextTrack = {
    kind: string,
    label: string,
    language: string,
    mode: string,
    ...
  };

  declare export class Player {
    /**
     * Destroys the video player and does any necessary cleanup.
     * This is especially helpful if you are dynamically adding and removing
     * videos to/from the DOM.
     */
    dispose(): void;

    /**
     * Check if the player has been disposed.
     *
     * @return {boolean} True if the player has been disposed, false otherwise.
     */
    isDisposed(): boolean;

    /**
     * Attempt to begin playback at the first opportunity.
     *
     * @return {Promise|void} Returns a promise if the browser
     * supports Promises. This promise will be resolved on the
     * return value of play.
     */
    play(): Promise<any> | void;

    /**
     * Pause the video playback.
     */
    pause(): void;

    /**
     * Check if the player is paused or has yet to play.
     *
     * @return {boolean} - false: if the media is currently playing
     *                   - true: if media is not currently playing
     */
    paused(): boolean;

    /**
     * Get a TimeRange object representing the current ranges of time that the
     * user has played.
     *
     * @return {TimeRange} A time range object that represents all the
     * increments of time that have been played.
     */
    played(): TimeRange;

    /**
     * Sets or returns whether or not the user is "scrubbing". Scrubbing is
     * when the user has clicked the progress bar handle and is dragging it
     * along the progress bar.
     *
     * @param {boolean} [isScrubbing] whether the user is or is not scrubbing
     * @return {boolean|void} - The value of scrubbing when getting
     *                        - Nothing when setting
     */
    scrubbing(isScrubbing?: boolean): boolean | void;

    /**
     * Get or set the current time (in seconds).
     *
     * @param {number|string} [seconds] The time to seek to in seconds
     * @return {number|void} - the current time in seconds when getting
     *                       - Nothing when setting
     */
    currentTime(seconds?: number | string): number | void;

    /**
     * Normally gets the length in time of the video in seconds;
     * in all but the rarest use cases an argument will NOT be passed
     * to the method.
     *
     * NOTE: The video must have started loading before the duration can be
     * known, and depending on preload behaviour may not be known until the
     * video starts playing.
     *
     * @param {number} [seconds] The duration of the video to set in seconds
     * @return {number|void} - The duration of the video in seconds when getting
     *                       - Nothing when setting
     */
    duration(seconds?: number): number | void;

    /**
     * Calculates how much time is left in the video. Not part of the native
     * video API.
     *
     * @return {number} The time remaining in seconds
     */
    remainingTime(): number;

    /**
     * A remaining time function that is intended to be used when
     * the time is to be displayed directly to the user.
     *
     * @return {number} The rounded time remaining in seconds
     */
    remainingTimeDisplay(): number;

    /**
     * Get a TimeRange object with an array of the times of the video
     * that have been downloaded. If you just want the percent of the
     * video that's been downloaded, use bufferedPercent.
     *
     * @return {TimeRange} A mock TimeRanges object (following HTML spec)
     */
    buffered(): TimeRange;

    /**
     * Get the TimeRanges of the media that are currently available for
     * seeking to.
     *
     * @return {TimeRange} A mock TimeRanges object (following HTML spec)
     */
    seekable(): TimeRange;

    /**
     * Returns whether the player is in the "seeking" state.
     *
     * @return {boolean} True if the player is in the seeking state, false
     * if not.
     */
    seeking(): boolean;

    /**
     * Returns whether the player is in the "ended" state.
     *
     * @return {boolean} True if the player is in the ended state, false if not.
     */
    ended(): boolean;

    /**
     * Get the percent (as a decimal) of the video that's been downloaded.
     * This method is not a part of the native HTML video API.
     *
     * @return {number} A decimal between 0 and 1 representing the percent
     *                  that is buffered 0 being 0% and 1 being 100%
     */
    bufferedPercent(): number;

    /**
     * Get the ending time of the last buffered time range.
     * This is used in the progress bar to encapsulate all time ranges.
     *
     * @return {number} The end of the last buffered time range
     */
    bufferedEnd(): number;

    /**
     * Get or set the current volume of the media.
     *
     * @param {number} [percentAsDecimal] The new volume as a decimal percent:
     *                                    - 0 is muted/0%/off
     *                                    - 1.0 is 100%/full
     *                                    - 0.5 is half volume or 50%
     * @return {number|void} The current volume as a percent when getting
     */
    volume(percentAsDecimal?: number): number | void;

    /**
     * Get the current muted state, or turn mute on or off.
     *
     * @param {boolean} [muted] - true to mute
     *                          - false to unmute
     * @return {boolean|void} - true if mute is on and getting
     *                        - false if mute is off and getting
     *                        - nothing if setting
     */
    muted(muted?: boolean): boolean | void;

    /**
     * Get the current defaultMuted state, or turn defaultMuted on or off.
     * defaultMuted
     * indicates the state of muted on initial playback.
     *
     * @param {boolean} [defaultMuted] - true to mute
     *                                 - false to unmute
     * @return {boolean|void} - true if defaultMuted is on and getting
     *                        - false if defaultMuted is off and getting
     *                        - Nothing when setting
     */
    defaultMuted(defaultMuted?: boolean): boolean | void;

    /**
     * Check if current tech can support native fullscreen (e.g. with built in
     * controls like iOS).
     *
     * @return {boolean} if native fullscreen is supported
     */
    supportsFullScreen(): boolean;

    /**
     * Check if the player is in fullscreen mode or tell the player that it
     * is or is not in fullscreen mode.
     *
     * NOTE: As of the latest HTML5 spec, isFullscreen is no longer an official
     * property and instead document.fullscreenElement is used. But isFullscreen
     * is still a valuable property for internal player workings.
     *
     * @param {boolean} [isFS] Set the players current fullscreen state
     * @return {boolean|void} - true if fullscreen is on and getting
     *                        - false if fullscreen is off and getting
     *                        - Nothing when setting
     */
    isFullscreen(isFS?: boolean): boolean | void;

    /**
     * Increase the size of the video to full screen.
     * In some browsers, full screen is not supported natively, so it enters
     * "full window mode", where the video fills the browser window.
     * In browsers and devices that support native full screen, sometimes the
     * browser's default controls will be shown, and not the Video.js custom
     * skin. This includes most mobile devices (iOS, Android) and older
     * versions of Safari.
     *
     * @param {Object} [fullscreenOptions] Override the player fullscreen
     * options
     * @return {Promise<any>} A promise for when fullscreen is entered
     */
    requestFullscreen(fullscreenOptions?: { ... }): Promise<any>;

    /**
     * Return the video to its normal size after having been in full screen
     * mode.
     *
     * @return {Promise<any>} A promise for when fullscreen is exited
     */
    exitFullscreen(): Promise<any>;

    /**
     * Get or set disable Picture-in-Picture mode.
     *
     * @param {boolean} [value] - true will disable Picture-in-Picture mode
     *                          - false will enable Picture-in-Picture mode
     * @return {boolean|void} Current disable state when getting
     */
    disablePictureInPicture(value?: boolean): boolean | void;

    /**
     * Check if the player is in Picture-in-Picture mode or tell the player that
     * it is or is not in Picture-in-Picture mode.
     *
     * @param {boolean} [isPiP] Set the players current Picture-in-Picture state
     * @return {boolean|void} - true if Picture-in-Picture is on and getting
     *                        - false if Picture-in-Picture is off and getting
     *                        - nothing if setting
     */
    isInPictureInPicture(isPiP?: boolean): boolean | void;

    /**
     * Create a floating video window always on top of other windows so that
     * users may continue consuming media while they interact with other
     * content sites, or applications on their device.
     *
     * @return {Promise<any>} A promise with a Picture-in-Picture window.
     */
    requestPictureInPicture(): Promise<any>;

    /**
     * Exit Picture-in-Picture mode.
     *
     * @return {Promise<any>} A promise.
     */
    exitPictureInPicture(): Promise<any>;

    /**
     * Check whether the player can play a given mimetype.
     *
     * @param {string} type The mimetype to check
     * @return {string} 'probably', 'maybe', or '' (empty string)
     */
    canPlayType(type: string): string;

    /**
     * Get or set the video source.
     *
     * @param {SourceObject|Array<SourceObject>|string} [source] A SourceObject,
     * an array of SourceObjects, or a string referencing
     * a URL to a media source. It is _highly recommended_ that an object
     * or array of objects is used here, so that source selection
     * algorithms can take the `type` into account.
     * If not provided, this method acts as a getter.
     * @return {string|void} If the `source` argument is missing, returns the
     * current source URL. Otherwise, returns nothing/undefined.
     */
    src(source?: SourceObject | Array<SourceObject> | string): string | void;

    /**
     * Begin loading the src data.
     */
    load(): void;

    /**
     * Returns the fully qualified URL of the current source value e.g. http://mysite.com/video.mp4
     * Can be used in conjunction with `currentType` to assist in rebuilding
     * the current source object.
     *
     * @return {string} The current source
     */
    currentSrc(): string;

    /**
     * Get the current source type e.g. video/mp4
     * This can allow you rebuild the current source object so that you could
     * load the same source and tech later.
     *
     * @return {string} The source MIME type
     */
    currentType(): string;

    /**
     * Get or set the preload attribute.
     *
     * @param {'none'|'auto'|'metadata'} [value] Preload mode to pass to tech
     * @return {string|void} - The preload attribute value when getting
     *                       - Nothing when setting
     */
    preload(value?: 'none' | 'auto' | 'metadata'): string | void;

    /**
     * Get or set the autoplay option. When this is a boolean it will
     * modify the attribute on the tech. When this is a string the attribute on
     * the tech will be removed and `Player` will handle autoplay on loadstarts.
     *
     * @param {boolean|'play'|'muted'|'any'} [value]
     *   - true: autoplay using the browser behavior
     *   - false: do not autoplay
     *   - 'play': call play() on every loadstart
     *   - 'muted': call muted() then play() on every loadstart
     *   - 'any': call play() on every loadstart. if that fails call muted()
     *     then play().
     *   - *: values other than those listed here will be set `autoplay` to true
     * @return {boolean|string|void} - The current value of autoplay when
     *                                 getting
     *                               - Nothing when setting
     */
    autoplay(
      value?: boolean | 'play' | 'muted' | 'any',
    ): boolean | string | void;

    /**
     * Set or unset the playsinline attribute.
     * Playsinline tells the browser that non-fullscreen playback is preferred.
     *
     * @param {boolean} [value] - true means that we should try to play inline
     *                            by default
     *                          - false means that we should use the browser's
     *                            default playback mode, which in most cases is
     *                            inline. iOS Safari is a notable exception
     *                            and plays fullscreen by default.
     * @return {string|void} - the current value of playsinline
     *                       - Nothing when setting
     */
    playsinline(value?: boolean): string | void;

    /**
     * Get or set the loop attribute on the video element.
     *
     * @param {boolean} [value] - true means that we should loop the video
     *                          - false means that we should not loop the video
     * @return {boolean|void} - The current value of loop when getting
     *                        - Nothing when setting
     */
    loop(value?: boolean): boolean | void;

    /**
     * Get or set the poster image source url.
     *
     * @param {string} [src] Poster image source URL
     * @return {string|void} - The current value of poster when getting
     *                       - Nothing when setting
     */
    poster(src?: string): string | void;

    /**
     * Get or set whether or not the controls are showing.
     *
     * @param {boolean} [bool] - true to turn controls on
     *                         - false to turn controls off
     * @return {boolean|void} - The current value of controls when getting
     *                        - Nothing when setting
     */
    controls(bool?: boolean): boolean | void;

    /**
     * Set or get the current MediaError.
     *
     * @param {MediaError|string|number} [err] A MediaError or a string/number
     * to be turned into a MediaError
     * @return {MediaError|null|void} - The current MediaError when getting
     *                                  (or null)
     *                                - Nothing when setting
     */
    error(err?: MediaError | string | number): MediaError | null | void;

    /**
     * Gets or sets the current playback rate. A playback rate of
     * 1.0 represents normal speed and 0.5 would indicate half-speed playback,
     * for instance.
     *
     * @param {number} [rate] New playback rate to set.
     * @return {number|void} - The current playback rate when getting or 1.0
     *                       - Nothing when setting
     */
    playbackRate(rate?: number): number | void;

    /**
     * Gets or sets the current default playback rate. A default playback rate
     * of 1.0 represents normal speed and 0.5 would indicate half-speed
     * playback, for instance. defaultPlaybackRate will only represent what the
     * initial playbackRate of a video was, not not the current playbackRate.
     *
     * @param {number} [rate] New default playback rate to set.
     * @return {number|void} - The default playback rate when getting or 1.0
     *                       - Nothing when setting
     */
    defaultPlaybackRate(rate?: number): number | void;

    /**
     * A helper method for adding a TextTrack to our TextTrackList.
     * In addition to the W3C settings we allow adding additional info
     * through options.
     *
     * @param {string} [kind] the kind of TextTrack you are adding
     * @param {string} [label] the label to give the TextTrack label
     * @param {string} [language] the language to set on the TextTrack
     * @return {TextTrack|void} the TextTrack that was added or undefined if
     * there is no tech
     */
    addTextTrack(
      kind?: string,
      label?: string,
      language?: string,
    ): TextTrack | void;

    /**
     * Get video width.
     *
     * @return {number} current video width
     */
    videoWidth(): number;

    /**
     * Get video height.
     *
     * @return {number} current video height
     */
    videoHeight(): number;

    /**
     * Set or get the player's language code.
     * Changing the language will trigger languagechange which Components can
     * use to update control text.
     *
     * @param {string} [code] the language code to set the player to
     * @return {string|void} - The current language code when getting
     *                       - Nothing when setting
     */
    language(code?: string): string | void;

    /**
     * Reset the player. Loads the first tech in the techOrder,
     * removes all the text tracks in the existing `tech`, and calls `reset`
     * on the `tech`.
     */
    reset(): void;
  }

  /**
   * The `videojs()` function doubles as the main function for users to create a
   * Player instance as well as the main library namespace.
   *
   * @param {string|Element} id Video element or video element ID.
   * @param {VideoJsOptions} [options] Options object for providing settings.
   * @param {PlayerReadyCallback} [ready] A function to be called when the
   * Player and Tech are ready.
   * @return {Player} The `videojs()` function returns a Player instance.
   */
  declare export default function videojs(
    id: string | Element,
    options?: VideoJsOptions,
    ready?: PlayerReadyCallback,
  ): Player;
}

declare module 'video.js/dist/video-js.css' {
  // CSS import
}

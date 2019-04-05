// flow-typed signature: f4c2e907bfc9b54623a88d7c7ce3cee0
// flow-typed version: b98ff4b09a/react-native-orientation-locker_v1.x.x/flow_>=v0.72.0

declare module "react-native-orientation-locker" {
  declare export type Orientations =
    | "PORTRAIT"
    | "LANDSCAPE-LEFT"
    | "LANDSCAPE-RIGHT"
    | "PORTRAIT-UPSIDEDOWN" //  not support at iOS now
    | "UNKNOWN";

  declare class Orientation {
    static addOrientationListener((payload: Orientations) => void): void;
    static removeOrientationListener((payload: Orientations) => void): void;

    static getInitialOrientation(): Orientations;

    static getOrientation((payload: Orientations) => void): void;

    static lockToLandscape(): void;
    static lockToLandscapeLeft(): void;
    static lockToLandscapeRight(): void;
    static lockToPortrait(): void;
    static lockToPortraitUpsideDown(): void;

    static unlockAllOrientations(): void;
  }

  declare export default typeof Orientation;
}

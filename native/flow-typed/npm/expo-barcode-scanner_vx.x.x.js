// flow-typed signature: 8a42efbaee521b12bea4117c5019bce6
// flow-typed version: <<STUB>>/expo-barcode-scanner_v12.1.0/flow_v0.182.0

declare module 'expo-barcode-scanner' {
  declare type StyleObj = 
    | null
    | void
    | number
    | false
    | ''
    | $ReadOnlyArray<StyleObj>
    | { [name: string]: any, ... };

  declare type ViewStyleProp = StyleObj;
  declare type ViewProps = {
    style?: ViewStyleProp,
  };

  declare opaque type BCT$aztec: number;
  declare opaque type BCT$codebar: number;
  declare opaque type BCT$code39: number;
  declare opaque type BCT$code93: number;
  declare opaque type BCT$code128: number;
  declare opaque type BCT$code39mod43: number;
  declare opaque type BCT$datamatrix: number;
  declare opaque type BCT$ean13: number;
  declare opaque type BCT$ean8: number;
  declare opaque type BCT$interleaved2of5: number;
  declare opaque type BCT$itf14: number;
  declare opaque type BCT$maxicode: number;
  declare opaque type BCT$pdf417: number;
  declare opaque type BCT$rss14: number;
  declare opaque type BCT$rssexpanded: number;
  declare opaque type BCT$upc_a: number;
  declare opaque type BCT$upc_e: number;
  declare opaque type BCT$upc_ean: number;
  declare opaque type BCT$qr: number;

  declare export type BarCodeTypeValues =
    | BCT$aztec
    | BCT$codebar
    | BCT$code39
    | BCT$code93
    | BCT$code128
    | BCT$code39mod43
    | BCT$datamatrix
    | BCT$ean13
    | BCT$ean8
    | BCT$interleaved2of5
    | BCT$itf14
    | BCT$maxicode
    | BCT$pdf417
    | BCT$rss14
    | BCT$rssexpanded
    | BCT$upc_a
    | BCT$upc_e
    | BCT$upc_ean
    | BCT$qr;

  declare export type BarCodeType = $ReadOnly<{|
    +aztec: BCT$aztec,
    +codebar: BCT$codebar,
    +code39: BCT$code39,
    +code93: BCT$code93,
    +code128: BCT$code128,
    +code39mod43: BCT$code39mod43,
    +datamatrix: BCT$datamatrix,
    +ean13: BCT$ean13,
    +ean8: BCT$ean8,
    +interleaved2of5: BCT$interleaved2of5,
    +itf14: BCT$itf14,
    +maxicode: BCT$maxicode,
    +pdf417: BCT$pdf417,
    +rss14: BCT$rss14,
    +rssexpanded: BCT$rssexpanded,
    +upc_a: BCT$upc_a,
    +upc_e: BCT$upc_e,
    +upc_ean: BCT$upc_ean,
    +qr: BCT$qr,
  |}>;

  declare export type Type = $ReadOnly<{|
    +front: string,
    +back: string,
  |}>;

  declare export type BarCodePoint = {
    +x: number,
    +y: number,
  };

  declare export type BarCodeSize = {
    +height: number,
    +width: number,
  };

  declare export type BarCodeBounds = {
    +origin: BarCodePoint,
    +size: BarCodeSize,
  };

  declare export type BarCodeScannerResult = {
    +type: string,
    +data: string,
    +bounds?: BarCodeBounds,
    +cornerPoints?: BarCodePoint[],
  };


  declare export type BarCodeEvent = BarCodeScannerResult & {
    +target?: number,
  };

  declare export type BarCodeEventCallbackArguments = {
    +nativeEvent: BarCodeEvent,
  };

  declare export type BarCodeScannedCallback = (params: BarCodeEvent) => void;

  declare export type BarCodeScannerProps = {|
    +type?: "front" | "back" | number,
    +barCodeTypes?: $ReadOnlyArray<BarCodeTypeValues>,
    +onBarCodeScanned?: BarCodeScannedCallback,
    ...ViewProps,
  |};

  declare export type PermissionStatus =
    | 'undetermined'
    | 'granted'
    | 'denied';
  
  declare export type PermissionExpiration = 'never' | number;
  
  declare export type PermissionResponse = {|
    +status: PermissionStatus,
    +expires: PermissionExpiration,
    +granted: boolean,
    +canAskAgain: boolean,
  |};

  declare export class BarCodeScanner extends React$Component<BarCodeScannerProps> {
    static Constants: $ReadOnly<{|
      BarCodeType: BarCodeType,
      Type: Type,
    |}>;

    static requestPermissionsAsync(): Promise<PermissionResponse>;
  }
}

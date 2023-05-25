import ExpoModulesCore

extension TypedArray {
  func data() -> Data {
    Data(bytes: self.rawPointer, count: self.byteLength)
  }
  
  func rawBufferPtr() -> UnsafeMutableRawBufferPointer {
    UnsafeMutableRawBufferPointer(start: self.rawPointer,
                                  count: self.byteLength)
  }
}

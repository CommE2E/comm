import ExpoModulesCore
import CryptoKit

public class AESCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AESCrypto")

    Function("generateKey", generateKey)
  }
}

// MARK: - Function implementations

private func generateKey(destination: Uint8Array) throws {
  let key = SymmetricKey(size: .bits256)
  guard destination.byteLength * 8 == key.bitCount else {
    throw InvalidKeyLengthException()
  }
  
  key.withUnsafeBytes { bytes in
    let _ = bytes.copyBytes(to: destination.rawBufferPtr())
  }
}

// MARK: - Utilities

extension TypedArray {
  func rawBufferPtr() -> UnsafeMutableRawBufferPointer {
    UnsafeMutableRawBufferPointer(start: self.rawPointer,
                                  count: self.byteLength)
  }
}

// MARK: - Exception definitions

private class InvalidKeyLengthException: Exception {
  override var reason: String {
    "The AES key has invalid length"
  }
}

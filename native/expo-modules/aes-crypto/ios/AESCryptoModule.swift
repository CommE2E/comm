import ExpoModulesCore
import CryptoKit

private let KEY_SIZE = 32 // bytes

public class AESCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AESCrypto")

    Function("generateKey", generateKey)
  }
}

// MARK: - Function implementations

private func generateKey(destination: Uint8Array) throws {
  guard destination.byteLength == KEY_SIZE else {
    throw InvalidKeyLengthException()
  }
  let key = SymmetricKey(size: .bits256)
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

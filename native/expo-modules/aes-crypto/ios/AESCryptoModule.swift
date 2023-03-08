import ExpoModulesCore
import CryptoKit

private let KEY_SIZE = 32 // bytes
private let IV_LENGTH = 12 // bytes, IV - unique Initialization Vector (nonce)
private let TAG_LENGTH = 16 // bytes - GCM auth tag

public class AESCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AESCrypto")

    Function("generateKey", generateKey)
    Function("encrypt", encrypt)
    Function("decrypt", decrypt)
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

private func encrypt(rawKey: Uint8Array,
                     plaintext: Uint8Array,
                     destination: Uint8Array) throws {
  guard destination.byteLength == plaintext.byteLength + IV_LENGTH + TAG_LENGTH
  else {
    throw InvalidDataLengthException()
  }
  
  let key = SymmetricKey(data: rawKey.data())
  let iv = AES.GCM.Nonce()
  let encryptionResult = try AES.GCM.seal(plaintext.data(),
                                          using: key,
                                          nonce: iv)

  // 'combined' returns concatenated: iv || ciphertext || tag
  guard let sealedData = encryptionResult.combined else {
    // this happens only if Nonce/IV != 12 bytes long
    throw EncryptionFailedException("Incorrect AES configuration")
  }
  guard sealedData.count == destination.byteLength else {
    throw EncryptionFailedException("Encrypted data has unexpected length")
  }
  sealedData.copyBytes(to: destination.rawBufferPtr())
}

private func decrypt(rawKey: Uint8Array,
                     sealedData: Uint8Array,
                     destination: Uint8Array) throws {
  guard destination.byteLength == sealedData.byteLength - IV_LENGTH - TAG_LENGTH
  else {
    throw InvalidDataLengthException()
  }
  
  let key = SymmetricKey(data: rawKey.data())
  let sealedBox = try AES.GCM.SealedBox(combined: sealedData.data())
  let plaintext = try AES.GCM.open(sealedBox, using: key)
  plaintext.copyBytes(to: destination.rawBufferPtr())
}

// MARK: - Utilities

extension TypedArray {
  func data() -> Data {
    Data(bytes: self.rawPointer, count: self.byteLength)
  }
  
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

private class InvalidDataLengthException: Exception {
  override var reason: String {
    "Source or destination array has invalid length"
  }
}

private class EncryptionFailedException: GenericException<String> {
  override var reason: String {
    "Failed to encrypt data: \(param)"
  }
}

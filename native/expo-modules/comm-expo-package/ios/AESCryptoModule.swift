import ExpoModulesCore
import CryptoKit

private let KEY_SIZE = 32 // bytes
private let IV_LENGTH = 12 // bytes, IV - unique Initialization Vector (nonce)
private let TAG_LENGTH = 16 // bytes - GCM auth tag

// Expo module called from the RN app JS code
public class AESCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AESCrypto")

    Function("generateKey") { (destination: Uint8Array) throws in
        try! generateKey(destinationPtr: destination.rawBufferPtr(),
                         byteLength: destination.byteLength)
    }

    Function("encrypt") { (rawKey: Uint8Array,
                           plaintext: Uint8Array,
                           destination: Uint8Array) throws in
        try! encrypt(rawKey: rawKey.data(),
                     plaintext: plaintext.data(),
                     plaintextLength: plaintext.byteLength,
                     destinationPtr: destination.rawBufferPtr(),
                     destinationLength: destination.byteLength)
    }
    
    Function("decrypt") { (rawKey: Uint8Array,
                            sealedData: Uint8Array,
                            destination: Uint8Array) throws in
        try! decrypt(rawKey: rawKey.data(),
                     sealedData: sealedData.data(),
                     sealedDataLength: sealedData.byteLength,
                     destinationPtr: destination.rawBufferPtr(),
                     destinationLength: destination.byteLength)
    }
  }
}

// ObjC-compatible module, used from Objective-C code in NSE
@objc(AESCryptoModuleObjCCompat)
public class AESCryptoModuleObjCCompat: NSObject {
  
  @objc(generateKey:withError:)
  public func generateKeyCompat(destination: NSMutableData) throws {
    let destinationPtr = UnsafeMutableRawBufferPointer(start: destination.mutableBytes, 
                                                       count: KEY_SIZE)
    try! generateKey(destinationPtr: destinationPtr,
                     byteLength: destination.length)
  }

  @objc(encryptWithKey:plaintext:destination:withError:)
  public func encryptCompat(rawKey: Data,
                            plaintext: Data,
                            destination: NSMutableData) throws {
    let destinationPtr = UnsafeMutableRawBufferPointer(start: destination.mutableBytes, 
                                                       count: destination.length)
    try! encrypt(rawKey: rawKey,
                 plaintext: plaintext,
                 plaintextLength: plaintext.count,
                 destinationPtr: destinationPtr,
                 destinationLength: destination.length)
  }
    
  @objc(decryptWithKey:sealedData:destination:withError:)
  public func decryptCompat(rawKey: Data,
                            sealedData: Data,
                            destination: NSMutableData) throws {
    let destinationPtr = UnsafeMutableRawBufferPointer(start: destination.mutableBytes,
                                                       count: destination.length)
    try! decrypt(rawKey: rawKey,
                 sealedData: sealedData,
                 sealedDataLength: sealedData.count,
                 destinationPtr: destinationPtr,
                 destinationLength: destination.length)
    }

}

// MARK: - Function implementations

private func generateKey(destinationPtr: UnsafeMutableRawBufferPointer,
                         byteLength: Int) throws {
  guard byteLength == KEY_SIZE else {
    throw InvalidKeyLengthException()
  }
  let key = SymmetricKey(size: .bits256)
  key.withUnsafeBytes { bytes in
    let _ = bytes.copyBytes(to: destinationPtr)
  }
}

private func encrypt(rawKey: Data,
                     plaintext: Data,
                     plaintextLength: Int,
                     destinationPtr: UnsafeMutableRawBufferPointer,
                     destinationLength: Int) throws {
  guard destinationLength == plaintextLength + IV_LENGTH + TAG_LENGTH
  else {
    throw InvalidDataLengthException()
  }
  
  let key = SymmetricKey(data: rawKey)
  let iv = AES.GCM.Nonce()
  let encryptionResult = try AES.GCM.seal(plaintext,
                                          using: key,
                                          nonce: iv)

  // 'combined' returns concatenated: iv || ciphertext || tag
  guard let sealedData = encryptionResult.combined else {
    // this happens only if Nonce/IV != 12 bytes long
    throw EncryptionFailedException("Incorrect AES configuration")
  }
  guard sealedData.count == destinationLength else {
    throw EncryptionFailedException("Encrypted data has unexpected length")
  }
  sealedData.copyBytes(to: destinationPtr)
}

private func decrypt(rawKey: Data,
                     sealedData: Data,
                     sealedDataLength: Int,
                     destinationPtr: UnsafeMutableRawBufferPointer,
                     destinationLength: Int) throws {
    guard destinationLength == sealedDataLength - IV_LENGTH - TAG_LENGTH
    else {
      throw InvalidDataLengthException()
    }
    
    let key = SymmetricKey(data: rawKey)
    let sealedBox = try AES.GCM.SealedBox(combined: sealedData)
    let plaintext = try AES.GCM.open(sealedBox, using: key)
    plaintext.copyBytes(to: destinationPtr)
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

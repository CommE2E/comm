/**
  File copied from expo-secure-store 14.x with some changes
  https://github.com/expo/expo/blob/49c9d53cf0a9fc8179d1c8f5268beadd141f70ca/packages/expo-secure-store/ios/SecureStoreExceptions.swift

  Why we copy: https://linear.app/comm/issue/ENG-10284/migrate-expo-secure-store-related-code
*/
import Foundation

open class Exception: Error {
  open lazy var name: String = String(describing: Self.self)
  
  /**
   String describing the reason of the exception.
   */
  open var reason: String {
    "undefined reason"
  }
}

open class GenericException<ParamType>: Exception {
  /**
   The additional parameter passed to the initializer.
   */
  public let param: ParamType
  
  /**
   The default initializer that takes a param and captures the place in the code where the exception was created.
   - Warning: Call it only with one argument! If you need to pass more parameters, use a tuple instead.
   */
  public init(_ param: ParamType, file: String = #fileID, line: UInt = #line, function: String = #function) {
    self.param = param
  }
}

internal final class InvalidKeyException: Exception {
  override var reason: String {
    "Invalid key"
  }
}

internal final class MissingPlistKeyException: Exception {
  override var reason: String {
    "You must set `NSFaceIDUsageDescription` in your Info.plist file to use the `requireAuthentication` option"
  }
}

internal final class SecAccessControlError: GenericException<Int?> {
  override var reason: String {
    return "Unable to construct SecAccessControl: \(param.map { "code " + String($0) } ?? "unknown error")"
  }
}

internal final class KeyChainException: GenericException<OSStatus> {
  override var reason: String {
    switch param {
    case errSecUnimplemented:
      return "Function or operation not implemented."
      
    case errSecIO:
      return "I/O error."
      
    case errSecOpWr:
      return "File already open with with write permission."
      
    case errSecParam:
      return "One or more parameters passed to a function where not valid."
      
    case errSecAllocate:
      return "Failed to allocate memory."
      
    case errSecUserCanceled:
      return "User canceled the operation."
      
    case errSecBadReq:
      return "Bad parameter or invalid state for operation."
      
    case errSecNotAvailable:
      return "No keychain is available. You may need to restart your computer."
      
    case errSecDuplicateItem:
      return "The specified item already exists in the keychain."
      
    case errSecItemNotFound:
      return "The specified item could not be found in the keychain."
      
    case errSecInteractionNotAllowed:
      return "User interaction is not allowed."
      
    case errSecDecode:
      return "Unable to decode the provided data."
      
    case errSecAuthFailed:
      return "Authentication failed. Provided passphrase/PIN is incorrect or there is no user authentication method configured for this device."
      
    default:
      if let errorMessage = SecCopyErrorMessageString(param, nil) as? String {
        return errorMessage
      }
      return "Unknown Keychain Error."
    }
  }
}

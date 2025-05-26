import Foundation

@objc
public enum SecureStoreAccessible: Int {
  case afterFirstUnlock = 0
  case afterFirstUnlockThisDeviceOnly = 1
  case always = 2
  case whenPasscodeSetThisDeviceOnly = 3
  case alwaysThisDeviceOnly = 4
  case whenUnlocked = 5
  case whenUnlockedThisDeviceOnly = 6
}

@objc(SecureStoreOptions)
public class SecureStoreOptions: NSObject {
  @objc public var authenticationPrompt: String?
  @objc public var keychainAccessible: SecureStoreAccessible = .whenUnlocked
  @objc public var keychainService: String?
  @objc public var requireAuthentication: Bool = false
  @objc public var accessGroup: String?
  
  @objc
  public override init() {
    super.init()
  }
}

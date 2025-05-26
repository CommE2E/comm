import LocalAuthentication
import Security

@objc(SecureStoreModule)
public final class SecureStoreModule: NSObject {
  @objc
  func getValueWithKey(key: String, options: SecureStoreOptions) -> String? {
    do {
      return try get(with: key, options: options)
    } catch let swiftError {
      return nil
    }
  }
  
  @objc
  func setValueWithKey(value: String, key: String, options: SecureStoreOptions) -> Bool {
    guard let key = validate(for: key) else {
      return false
    }
    do {
      return try set(value: value, with: key, options: options)
    } catch let swiftError {
      return false
    }
  }
  
  private func get(with key: String, options: SecureStoreOptions) throws -> String? {
    guard let key = validate(for: key) else {
      throw InvalidKeyException()
    }
    
    if let unauthenticatedItem = try searchKeyChain(with: key, options: options, requireAuthentication: false) {
      return String(data: unauthenticatedItem, encoding: .utf8)
    }
    
    if let authenticatedItem = try searchKeyChain(with: key, options: options, requireAuthentication: true) {
      return String(data: authenticatedItem, encoding: .utf8)
    }
    
    if let legacyItem = try searchKeyChain(with: key, options: options) {
      return String(data: legacyItem, encoding: .utf8)
    }
    
    return nil
  }
  
  private func set(value: String, with key: String, options: SecureStoreOptions) throws -> Bool {
    var setItemQuery = query(with: key, options: options, requireAuthentication: options.requireAuthentication)
    
    let valueData = value.data(using: .utf8)
    setItemQuery[kSecValueData as String] = valueData
    
    let accessibility = attributeWith(options: options)
    
    if !options.requireAuthentication {
      setItemQuery[kSecAttrAccessible as String] = accessibility
    } else {
      guard let _ = Bundle.main.infoDictionary?["NSFaceIDUsageDescription"] as? String else {
        throw MissingPlistKeyException()
      }
      
      var error: Unmanaged<CFError>? = nil
      guard let accessOptions = SecAccessControlCreateWithFlags(kCFAllocatorDefault, accessibility, .biometryCurrentSet, &error) else {
        let errorCode = error.map { CFErrorGetCode($0.takeRetainedValue()) }
        throw SecAccessControlError(errorCode)
      }
      setItemQuery[kSecAttrAccessControl as String] = accessOptions
    }
    
    let status = SecItemAdd(setItemQuery as CFDictionary, nil)
    
    switch status {
    case errSecSuccess:
      // On success we want to remove the other key alias and legacy key (if they exist) to avoid conflicts during reads
      SecItemDelete(query(with: key, options: options) as CFDictionary)
      SecItemDelete(query(with: key, options: options, requireAuthentication: !options.requireAuthentication) as CFDictionary)
      return true
    case errSecDuplicateItem:
      return try update(value: value, with: key, options: options)
    default:
      throw KeyChainException(status)
    }
  }
  
  private func update(value: String, with key: String, options: SecureStoreOptions) throws -> Bool {
    var query = query(with: key, options: options, requireAuthentication: options.requireAuthentication)
    
    let valueData = value.data(using: .utf8)
    let updateDictionary = [kSecValueData as String: valueData]
    
    if let authPrompt = options.authenticationPrompt {
      query[kSecUseOperationPrompt as String] = authPrompt
    }
    
    let status = SecItemUpdate(query as CFDictionary, updateDictionary as CFDictionary)
    
    if status == errSecSuccess {
      return true
    } else {
      throw KeyChainException(status)
    }
  }
  
  private func searchKeyChain(with key: String, options: SecureStoreOptions, requireAuthentication: Bool? = nil) throws -> Data? {
    var query = query(with: key, options: options, requireAuthentication: requireAuthentication)
    
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    query[kSecReturnData as String] = kCFBooleanTrue
    
    if let authPrompt = options.authenticationPrompt {
      query[kSecUseOperationPrompt as String] = authPrompt
    }
    
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    
    switch status {
    case errSecSuccess:
      guard let item = item as? Data else {
        return nil
      }
      return item
    case errSecItemNotFound:
      return nil
    default:
      throw KeyChainException(status)
    }
  }
  
  private func query(with key: String, options: SecureStoreOptions, requireAuthentication: Bool? = nil) -> [String: Any] {
    var service = options.keychainService ?? "app"
    if let requireAuthentication {
      service.append(":\(requireAuthentication ? "auth" : "no-auth")")
    }
    
    let encodedKey = Data(key.utf8)
    
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrGeneric as String: encodedKey,
      kSecAttrAccount as String: encodedKey
    ]
    
    if let accessGroup = options.accessGroup {
      query[kSecAttrAccessGroup as String] = accessGroup
    }
    
    return query
  }
  
  private func attributeWith(options: SecureStoreOptions) -> CFString {
    switch options.keychainAccessible {
    case .afterFirstUnlock:
      return kSecAttrAccessibleAfterFirstUnlock
    case .afterFirstUnlockThisDeviceOnly:
      return kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    case .always:
      return kSecAttrAccessibleAlways
    case .whenPasscodeSetThisDeviceOnly:
      return kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
    case .whenUnlocked:
      return kSecAttrAccessibleWhenUnlocked
    case .alwaysThisDeviceOnly:
      return kSecAttrAccessibleAlwaysThisDeviceOnly
    case .whenUnlockedThisDeviceOnly:
      return kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    }
  }
  
  private func validate(for key: String) -> String? {
    let trimmedKey = key.trimmingCharacters(in: .whitespaces)
    if trimmedKey.isEmpty {
      return nil
    }
    return key
  }
}

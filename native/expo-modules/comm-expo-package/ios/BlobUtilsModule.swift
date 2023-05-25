import ExpoModulesCore

// This type corresponds to the BlobData interface in react-native
struct BlobMetadata: Record {
  @Field var blobId: String
  @Field var size: Int
  @Field var offset: Int
}

public class BlobUtilsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BlobUtils")

    Function("copyBlobToTypedArray") {
      (blob: BlobMetadata, destination: Uint8Array) throws in
      let blobManager = try self.getReactBlobManager()
      guard let blobData = blobManager.resolve(blob.blobId,
                                               offset: blob.offset,
                                               size: blob.size) else {
        throw NoSuchBlobException(blob.blobId)
      }
      blobData.copyBytes(to: destination.rawBufferPtr())
    }

    Function("blobFromTypedArray") { (source: TypedArray) throws -> String in
      let blobManager = try self.getReactBlobManager()
      guard let blobID = blobManager.store(source.data()) else {
        throw BlobCreationFailedException()
      }
      return blobID
    }
  }

  private func getReactBlobManager() throws -> RCTBlobManager {
    guard let bridge = self.appContext?.reactBridge else {
      throw BridgeNotFoundException()
    }
    guard let blobManager = bridge.module(for: RCTBlobManager.self)
            as? RCTBlobManager else {
      throw BlobManagerNotFoundException()
    }
    return blobManager
  }
}

// MARK: Exception definitions

class BridgeNotFoundException: Exception {
  override var reason: String {
    "React bridge is null"
  }
}

class BlobManagerNotFoundException: Exception {
  override var reason: String {
    "Module RCTBlobManager not found"
  }
}

class NoSuchBlobException: GenericException<String> {
  override var reason: String {
    "No blob data found for blob id=\(param)"
  }
}

class BlobCreationFailedException: Exception {
  override var reason: String {
    "Failed to store blob"
  }
}

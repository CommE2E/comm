import ExpoModulesCore

public class ThumbhashModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Thumbhash")

    AsyncFunction("generateThumbHash", generateThumbHash)
  }
}

// MARK: - Function implementations

private func generateThumbHash(photoURI: URL) throws -> String {
  let imageData = try Data(contentsOf: photoURI)
  guard let image = UIImage(data: imageData) else {
    throw LoadingFailureException(photoURI.absoluteString)
  }

  return thumbHash(fromImage: image).base64EncodedString()
}

// MARK: - Exception definitions

private class LoadingFailureException: GenericException<String> {
  override var reason: String {
    "Failed to load image URI: \(param)"
  }
}

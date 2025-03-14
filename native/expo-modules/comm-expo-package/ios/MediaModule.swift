import ExpoModulesCore
import AVFoundation

extension FourCharCode {
  // Create a string representation of a FourCC.
  func toString() -> String {
    let bytes: [CChar] = [
      CChar((self >> 24) & 0xff),
      CChar((self >> 16) & 0xff),
      CChar((self >> 8) & 0xff),
      CChar(self & 0xff),
      0
    ]
    let result = String(cString: bytes)
    let characterSet = CharacterSet.whitespaces
    return result.trimmingCharacters(in: characterSet)
  }
}


public struct VideoInfo: Record {
  public init(){}
  @Field
  var codec: String = "N/A"
  
  @Field
  var duration: Int = 0
  
  @Field
  var width: Int = 0
  
  @Field
  var height: Int = 0
  
  @Field
  var format: String = "N/A"
}

public class MediaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaModule")
    
    AsyncFunction("getVideoInfo", getVideoInfo)
    AsyncFunction("hasMultipleFrames", hasMultipleFrames)
  }
  
  
  // MARK: - Function implementations
  
  private func getVideoInfo(path: URL) throws -> VideoInfo {
    let asset = AVAsset(url: path)
    
    let duration = CMTimeGetSeconds(asset.duration)
    
    let videoInfo = VideoInfo()
    
    videoInfo.duration = Int(duration)
    
    if let track = asset.tracks(withMediaType: .video).first {
      let size = track.naturalSize
      videoInfo.width = Int(size.width)
      videoInfo.height = Int(size.height)
      
      let description = track.formatDescriptions.first as! CMFormatDescription
      let codec = CMFormatDescriptionGetMediaSubType(description).toString()
      
      videoInfo.codec = codec
    } else {
      throw NoVideoTrackException(path)
    }
    
    videoInfo.format = path.pathExtension
    
    return videoInfo
  }
  
  private func hasMultipleFrames(path: URL) throws -> Bool {
    guard let imageSource = CGImageSourceCreateWithURL(path as CFURL, nil) else {
      throw FailedToLoadGifException(path)
    }
    
    let count = CGImageSourceGetCount(imageSource)
    
    return count > 1
  }
}

// MARK: - Exception definitions

private class NoVideoTrackException: GenericException<URL> {
  override var reason: String {
    "No video track found in file URI: \(param)"
  }
}

private class FailedToLoadGifException: GenericException<URL> {
  override var reason: String {
    "Failed to load gif at URI: \(param)"
  }
}

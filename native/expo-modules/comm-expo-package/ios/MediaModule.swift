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

public struct TranscodeOptions: Record {
  public init(){}
  @Field
  var width: Int = -1

  @Field
  var height: Int = -1
}

let TRANSCODE_PROGRESS_EVENT_NAME = "onTranscodeProgress"

public class MediaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaModule")
    
    AsyncFunction("getVideoInfo", getVideoInfo)
    AsyncFunction("hasMultipleFrames", hasMultipleFrames)
    AsyncFunction("generateThumbnail", generateThumbnail)
    AsyncFunction("transcodeVideo", transcodeVideo)
    
    Events(TRANSCODE_PROGRESS_EVENT_NAME)
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

  private func generateThumbnail(inputPath: URL, outputPath: URL) throws {
    let asset = AVURLAsset(url: inputPath)
    let generator = AVAssetImageGenerator(asset: asset)
    
    generator.appliesPreferredTrackTransform = true
    
    let time = CMTimeMake(value: 0, timescale: 1000)
    
    let imgRef = try generator.copyCGImage(at: time, actualTime: nil)
    let thumbnail = UIImage(cgImage: imgRef)
    
    guard let data = thumbnail.jpegData(compressionQuality: CGFloat(0.9)) else {
      throw CorruptedImageDataException()
    }
    
    do {
      try data.write(to: outputPath, options: .atomic)
    } catch let error {
      throw ImageWriteFailedException(error.localizedDescription)
    }
  }

  private func transcodeVideo(inputPath: URL, outputPath: URL, options: TranscodeOptions, promise: Promise) throws {
    let asset = AVAsset(url: inputPath)
    
    guard let assetReader = try? AVAssetReader(asset: asset) else {
      print("Failed to initialize asset or asset reader.")
      return
    }
    
    let totalDuration = asset.duration
    
    let videoTrack = asset.tracks(withMediaType: .video).first!
    //let audioTrack = asset.tracks(withMediaType: .audio).first!
    
    let videoReaderSettings: [String: Any] = [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_420YpCbCr8BiPlanarFullRange)]
    
    let videoTrackOutput = AVAssetReaderTrackOutput(track: videoTrack, outputSettings: videoReaderSettings)
    //let audioTrackOutput = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: nil) // `nil` for default audio processing settings
    
    if assetReader.canAdd(videoTrackOutput) {
      assetReader.add(videoTrackOutput)
    }
    //    if assetReader.canAdd(audioTrackOutput) {
    //      assetReader.add(audioTrackOutput)
    //    }
    
    guard let assetWriter = try? AVAssetWriter(outputURL: outputPath, fileType: AVFileType.mp4) else {
      print("Error initializing AVAssetWriter")
      return
    }
    
    let videoCompressionSettings: [String: Any] = [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: 400, // Custom resolution
      AVVideoHeightKey: 680,
      AVVideoCompressionPropertiesKey: [
        //AVVideoAverageBitRateKey: 5_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264Baseline30,
      ]
    ]
    
    let videoWriterInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoCompressionSettings)
    // let audioWriterInput = AVAssetWriterInput(mediaType: .audio, outputSettings: nil) // Default audio settings
    assetWriter.shouldOptimizeForNetworkUse = true
    
    if assetWriter.canAdd(videoWriterInput) {
      assetWriter.add(videoWriterInput)
    }
    //    if assetWriter.canAdd(audioWriterInput) {
    //      assetWriter.add(audioWriterInput)
    //    }
    
    assetReader.startReading()
    assetWriter.startWriting()
    
    assetWriter.startSession(atSourceTime: CMTime.zero)
    
    let dispatchGroup = DispatchGroup()
    
    dispatchGroup.enter()
    var frames = 0
    videoWriterInput.requestMediaDataWhenReady(on: DispatchQueue(label: "videoQueue")) {
      while videoWriterInput.isReadyForMoreMediaData {
        if let sampleBuffer = videoTrackOutput.copyNextSampleBuffer() {
          
          let currentSampleTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
          let progress = CMTimeGetSeconds(currentSampleTime) / CMTimeGetSeconds(totalDuration)
          if(frames % 20 == 0) {
            print("Current progress: \(progress)")
            self.sendEvent(TRANSCODE_PROGRESS_EVENT_NAME, [
              "progress": progress
            ])
          }
          frames += 1
          videoWriterInput.append(sampleBuffer)
        } else {
          videoWriterInput.markAsFinished()
          dispatchGroup.leave()
          self.sendEvent(TRANSCODE_PROGRESS_EVENT_NAME, [
            "progress": 1
          ])
          break
        }
      }
    }
    
    //    dispatchGroup.enter()
    //    audioWriterInput.requestMediaDataWhenReady(on: DispatchQueue(label: "audioQueue")) {
    //      while audioWriterInput.isReadyForMoreMediaData {
    //        if let sampleBuffer = audioTrackOutput.copyNextSampleBuffer() {
    //          audioWriterInput.append(sampleBuffer)
    //        } else {
    //          audioWriterInput.markAsFinished()
    //          dispatchGroup.leave()
    //          break
    //        }
    //      }
    //    }
    
    dispatchGroup.notify(queue: .main) {
      assetWriter.finishWriting {
        switch assetWriter.status {
        case .failed:
          print("Error: \(String(describing: assetWriter.error))")
        case .completed:
          print("Transcoding completed successfully.")
          promise.resolve()
        default:
          break
        }
        assetReader.cancelReading()
      }
    }
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

private class CorruptedImageDataException: Exception {
  override var reason: String {
    "Cannot create image data for saving of the thumbnail of the given video"
  }
}

private class ImageWriteFailedException: GenericException<String> {
  override var reason: String {
    "Writing image data to the file has failed: \(param)"
  }
}

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

enum H264Profile: String, Enumerable {
  case baseline
  case main
  case high
}

public struct TranscodeOptions: Record {
  public init(){}
  @Field
  var width: Double = -1
  
  @Field
  var height: Double = -1
  
  @Field
  var bitrate: Int = -1
  
  @Field
  var profile: H264Profile = .high
}

public struct TranscodeStats: Record {
  public init(){}
  @Field
  var size: Int = 0
  
  @Field
  var duration: Int = 0
  
  @Field
  var speed: Double = 0
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
  
  var timer: Timer? = nil
  
  private func transcodeVideo(inputPath: URL, outputPath: URL, options: TranscodeOptions, promise: Promise) throws {
    let asset = AVURLAsset(url: inputPath)
    
    guard let assetReader = try? AVAssetReader(asset: asset) else {
      promise.reject(TranscodingFailed("Failed to initialize asset or asset reader."))
      return
    }
    
    let totalDuration = asset.duration
    
    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
      promise.reject(TranscodingFailed("File has no video track"))
      return
    }
    let audioTrack = asset.tracks(withMediaType: .audio).first
    
    let videoReaderSettings: [String: Any] = [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_420YpCbCr8BiPlanarFullRange)]
    
    let videoTrackOutput = AVAssetReaderTrackOutput(track: videoTrack, outputSettings: videoReaderSettings)
    
    if assetReader.canAdd(videoTrackOutput) {
      assetReader.add(videoTrackOutput)
    }
    
    var audioTrackOutput:AVAssetReaderTrackOutput? = nil
    
    if let audioTrack = audioTrack {
      let audioOutputSettingsDict: [String : Any] = [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: 44100
      ]
      
      let output = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: audioOutputSettingsDict)
      if assetReader.canAdd(output) {
        assetReader.add(output)
      }
      audioTrackOutput = output
    }
    
    guard let assetWriter = try? AVAssetWriter(outputURL: outputPath, fileType: AVFileType.mp4) else {
      promise.reject(TranscodingFailed("Error initializing AVAssetWriter"))
      return
    }
    assetWriter.shouldOptimizeForNetworkUse = true
    
    var videoCompressionSettings: [String: Any] = [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: options.width,
      AVVideoHeightKey: options.height,
    ]
    var videoCompressionProperties: [String: Any] = [:]
    if(options.bitrate != -1) {
      videoCompressionProperties[AVVideoAverageBitRateKey] = options.bitrate*1000
    }
    videoCompressionProperties[AVVideoProfileLevelKey] = switch options.profile {
    case .baseline:
      AVVideoProfileLevelH264BaselineAutoLevel
    case .main:
      AVVideoProfileLevelH264MainAutoLevel
    case .high:
      AVVideoProfileLevelH264HighAutoLevel
    }
    
    videoCompressionSettings[AVVideoCompressionPropertiesKey] = videoCompressionProperties
    
    let videoWriterInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoCompressionSettings)
    
    if assetWriter.canAdd(videoWriterInput) {
      assetWriter.add(videoWriterInput)
    }
    
    var audioWriterInput: AVAssetWriterInput? = nil
    
    if(audioTrack != nil) {
      let audioInputSettingsDict: [String:Any] = [AVFormatIDKey : kAudioFormatMPEG4AAC,
                                          AVNumberOfChannelsKey : 2,
                                                AVSampleRateKey : 44100.0,
                                             AVEncoderBitRateKey: 128000
      ]
      
      let input = AVAssetWriterInput(mediaType: .audio, outputSettings: audioInputSettingsDict)
      if assetWriter.canAdd(input) {
        assetWriter.add(input)
      }
      audioWriterInput = input
    }
    
    
    
    assetReader.startReading()
    assetWriter.startWriting()
    
    assetWriter.startSession(atSourceTime: CMTime.zero)
    
    var progress = 0.0
    DispatchQueue.main.async {
      self.timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] timer in
        self?.sendEvent(TRANSCODE_PROGRESS_EVENT_NAME, [
          "progress": progress
        ])
      }
    }
    
    let startTime = CFAbsoluteTimeGetCurrent()
    
    let dispatchGroup = DispatchGroup()
    
    dispatchGroup.enter()
    videoWriterInput.requestMediaDataWhenReady(on: DispatchQueue(label: "videoQueue")) {
      while videoWriterInput.isReadyForMoreMediaData {
        if let sampleBuffer = videoTrackOutput.copyNextSampleBuffer() {
          let currentSampleTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
          progress = CMTimeGetSeconds(currentSampleTime) / CMTimeGetSeconds(totalDuration)
          videoWriterInput.append(sampleBuffer)
        } else {
          videoWriterInput.markAsFinished()
          dispatchGroup.leave()
          break
        }
      }
    }
    
    if let audioWriterInput = audioWriterInput, let audioTrackOutput = audioTrackOutput {
      dispatchGroup.enter()
      audioWriterInput.requestMediaDataWhenReady(on: DispatchQueue(label: "audioQueue")) {
        while audioWriterInput.isReadyForMoreMediaData {
          if let sampleBuffer = audioTrackOutput.copyNextSampleBuffer() {
            audioWriterInput.append(sampleBuffer)
          } else {
            audioWriterInput.markAsFinished()
            dispatchGroup.leave()
            break
          }
        }
      }
    }
    
    dispatchGroup.notify(queue: .main) {
      assetWriter.finishWriting {
        switch assetWriter.status {
        case .failed:
          promise.reject(TranscodingFailed(String(describing: assetWriter.error)))
          break
        case .completed:
          print("Transcoding completed successfully.")
          self.timer?.invalidate()
          self.timer = nil
          self.sendEvent(TRANSCODE_PROGRESS_EVENT_NAME, [
            "progress": 1
          ])
          let endTime = CFAbsoluteTimeGetCurrent()
          promise.resolve(self.getStats(outputPath, startTime, endTime))
          break
        default:
          break
        }
        assetReader.cancelReading()
      }
    }
  }
  
  private func getStats(_ url: URL, _ startTime: CFAbsoluteTime, _ endTime: CFAbsoluteTime) -> TranscodeStats {
    let stats = TranscodeStats()
    
    let resourceValues = try? url.resourceValues(forKeys: [.fileSizeKey])
    let fileSize =  resourceValues?.fileSize ?? 0
    stats.size = fileSize
    
    let asset = AVAsset(url: url)
    let duration = CMTimeGetSeconds(asset.duration)
    stats.duration = Int(duration)
    stats.speed = duration/(endTime-startTime)
    return stats
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

private class TranscodingFailed: GenericException<String> {
  override var reason: String {
    "Transcoding failed: \(param)"
  }
}

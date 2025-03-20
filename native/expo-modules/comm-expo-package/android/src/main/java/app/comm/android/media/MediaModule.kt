package app.comm.android.media

import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.graphics.Movie
import android.graphics.drawable.AnimatedImageDrawable
import android.media.MediaCodecInfo.CodecProfileLevel
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.Format
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.Enumerable
import java.io.File
import java.io.FileOutputStream

class VideoInfo : Record {
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

enum class H264Profile(val value: String) : Enumerable {
  baseline("baseline"),
  main("main"),
  high("high"),
}


class TranscodeOptions : Record {
  @Field
  var width: Double = -1.0

  @Field
  var height: Double = -1.0

  @Field
  var bitrate: Int = -1

  @Field
  var profile: H264Profile = H264Profile.high
}

class TranscodeStats : Record {
  @Field
  var size: Long = 0

  @Field
  var duration: Int = 0

  @Field
  var speed: Double = 0.0
}

const val TRANSCODE_PROGRESS_EVENT_NAME = "onTranscodeProgress"

class MediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MediaModule")

    AsyncFunction("getVideoInfo", this@MediaModule::getVideoInfo)
    AsyncFunction("hasMultipleFrames", this@MediaModule::hasMultipleFrames)
    AsyncFunction("generateThumbnail", this@MediaModule::generateThumbnail)
    AsyncFunction("transcodeVideo", this@MediaModule::transcodeVideo)

    Events(TRANSCODE_PROGRESS_EVENT_NAME)
  }


  // region Function implementations

  private fun getVideoInfo(path: String): VideoInfo {
    val videoInfo = VideoInfo()
    val extractor = MediaExtractor()
    try {
      extractor.setDataSource(Uri.decode(path).replace("file://", ""))
      var videoTrackIndex = -1
      var format: MediaFormat? = null

      // Search for the video track by checking the MIME type of each track
      for (i in 0 until extractor.trackCount) {
        format = extractor.getTrackFormat(i)
        val mimeType = format.getString(MediaFormat.KEY_MIME)
        if (mimeType?.startsWith("video/") == true) {
          videoTrackIndex = i
          break
        }
      }

      if (videoTrackIndex == -1 || format == null) {
        throw NoVideoTrackException(path)
      }

      videoInfo.duration = (format.getLong(MediaFormat.KEY_DURATION) / 1_000_000).toInt()
      videoInfo.width = format.getInteger(MediaFormat.KEY_WIDTH)
      videoInfo.height = format.getInteger(MediaFormat.KEY_HEIGHT)
      videoInfo.codec =
        format.getString(MediaFormat.KEY_MIME)?.substring("video/".length) ?: "N/A"
      videoInfo.format = path.substring(path.lastIndexOf('.') + 1)
    } catch (e: Exception) {
      throw FailedToReadVideoInfoException(path, e)
    } finally {
      extractor.release()
    }
    return videoInfo
  }

  private fun hasMultipleFrames(path: String): Boolean {
    val context = appContext.reactContext!!
    val uri = Uri.parse(path)
    try {
      context.contentResolver.openInputStream(uri).use { inputStream ->
        if (inputStream != null) {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val src = ImageDecoder.createSource(context.contentResolver, uri)
            val drawable = ImageDecoder.decodeDrawable(src)
            return (drawable is AnimatedImageDrawable)
          } else {
            val movie = Movie.decodeStream(inputStream)
            return movie?.duration()?.let { duration -> duration > 0 } ?: false
          }
        } else {
          throw FailedToOpenGif(path, Exception("inputStream is null"))
        }
      }
    } catch (e: Exception) {
      throw FailedToOpenGif(path, e)
    }
  }

  private fun generateThumbnail(inputPath: String, outputPath: String) {
    val thumbnail: Bitmap? = try {
      MediaMetadataRetriever()
        .use { retriever ->
          retriever.setDataSource(Uri.decode(inputPath).replace("file://", ""))
          retriever.getFrameAtTime(
            0,
            MediaMetadataRetriever.OPTION_CLOSEST_SYNC
          )
        }
    } catch (e: Exception) {
      throw GenerateThumbnailException(inputPath, e)
    }

    try {
      FileOutputStream(outputPath).use { outputStream ->
        thumbnail?.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
      }
    } catch (e: Exception) {
      throw SaveThumbnailException(outputPath, e)
    }
  }

  @OptIn(UnstableApi::class)
  private fun transcodeVideo(
    inputPath: String,
    outputPath: String,
    options: TranscodeOptions,
    promise: Promise
  ) {

    val context = appContext.reactContext!!
    val mediaItem = MediaItem.Builder()
      .setUri(Uri.parse(inputPath))
      .build()

    val effects = Effects(
      listOf(), listOf(
        Presentation.createForWidthAndHeight(
          options.width.toInt(),
          options.height.toInt(),
          Presentation.LAYOUT_SCALE_TO_FIT
        )
      )
    )

    val editedMediaItem = EditedMediaItem.Builder(mediaItem)
      .setEffects(effects)
      .build()

    val profile = when (options.profile) {
      H264Profile.baseline -> CodecProfileLevel.AVCProfileBaseline
      H264Profile.main -> CodecProfileLevel.AVCProfileMain
      H264Profile.high -> CodecProfileLevel.AVCProfileHigh
    }

    val videoEncoderFactory = DefaultEncoderFactory.Builder(context)
      .setRequestedVideoEncoderSettings(
        VideoEncoderSettings.DEFAULT.buildUpon()
          .setBitrate(if (options.bitrate == -1) Format.NO_VALUE else options.bitrate * 1000)
          .setEncodingProfileLevel(profile, Format.NO_VALUE)
          .build()
      )
      .build()


    val newFile = File(Uri.parse(outputPath).path)

    if (!newFile.exists()) {
      val created = newFile.createNewFile()
      if (!created) {
        promise.reject(FailedToCreateFile(outputPath))
        return
      }
    }
    var transformer: Transformer? = null
    val handler = Handler(Looper.getMainLooper())
    val progressHolder = ProgressHolder()
    val runnable = object : Runnable {
      override fun run() {
        transformer?.getProgress(progressHolder)
        sendEvent(
          TRANSCODE_PROGRESS_EVENT_NAME,
          mapOf("progress" to progressHolder.progress / 100.0)
        )
        handler.postDelayed(this, 200)
      }
    }

    handler.post {
      val startTime = System.currentTimeMillis()
      transformer = Transformer.Builder(context)
        .setVideoMimeType(MimeTypes.VIDEO_H264)
        .setAudioMimeType(MimeTypes.AUDIO_AAC)
        .setEncoderFactory(videoEncoderFactory)
        .addListener(object : Transformer.Listener {
          override fun onCompleted(composition: Composition, exportResult: ExportResult) {
            handler.removeCallbacks(runnable)
            sendEvent(
              TRANSCODE_PROGRESS_EVENT_NAME,
              mapOf("progress" to 1)
            )
            val stats = TranscodeStats()
            stats.duration = (exportResult.durationMs / 1000).toInt()
            stats.size = exportResult.fileSizeBytes
            val endTime = System.currentTimeMillis()
            stats.speed = (exportResult.durationMs).toDouble() / (endTime - startTime)
            promise.resolve(stats)
          }

          override fun onError(
            composition: Composition,
            exportResult: ExportResult,
            exportException: ExportException
          ) {
            handler.removeCallbacks(runnable)
            promise.reject(TranscodingFailed(exportException))
          }
        })
        .build()
      transformer?.start(editedMediaItem, Uri.parse(outputPath).path!!)
    }
    handler.post(runnable)
  }
}

// endregion

// region Exception definitions

private class FailedToReadVideoInfoException(uri: String, cause: Throwable) :
  CodedException("Failed to read video info for URI: $uri", cause)

private class NoVideoTrackException(uri: String) :
  CodedException("No video track found in file: $uri")

private class FailedToOpenGif(uri: String, cause: Throwable) :
  CodedException("Failed to open file: $uri", cause)

private class GenerateThumbnailException(uri: String, cause: Throwable) :
  CodedException("Could not generate thumbnail from file: $uri", cause)

private class SaveThumbnailException(uri: String, cause: Throwable) :
  CodedException("Could not save thumbnail to $uri", cause)

private class FailedToCreateFile(uri: String) :
  CodedException("Failed to create file $uri")

private class TranscodingFailed(cause: Throwable) :
  CodedException("Transcoding failed: ", cause)
// endregion

package app.comm.android.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.graphics.Movie
import android.graphics.drawable.AnimatedImageDrawable
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
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


class MediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MediaModule")

    AsyncFunction("getVideoInfo", this@MediaModule::getVideoInfo)
    AsyncFunction("hasMultipleFrames", this@MediaModule::hasMultipleFrames)
    AsyncFunction("generateThumbnail", this@MediaModule::generateThumbnail)
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
    val retriever = MediaMetadataRetriever()
    val thumbnail: Bitmap? = try {
      retriever.setDataSource(Uri.decode(inputPath).replace("file://", ""))
      retriever.getFrameAtTime(
        0,
        MediaMetadataRetriever.OPTION_CLOSEST_SYNC
      )
    } catch (e: Exception) {
      throw GenerateThumbnailException(inputPath, e)
    } finally {
      retriever.release()
    }

    try {
      FileOutputStream(outputPath).use { outputStream ->
        thumbnail?.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
      }
    } catch (e: Exception) {
      throw SaveThumbnailException(outputPath, e)
    }
  }

  private val context: Context
    get() = requireNotNull(this.appContext.reactContext) {
      "React Application Context is null"
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

// endregion

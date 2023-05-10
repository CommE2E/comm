package app.comm.android.thumbhash

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.util.Base64
import androidx.annotation.RequiresApi
import androidx.core.graphics.scale
import androidx.core.util.component1
import androidx.core.util.component2
import expo.modules.core.errors.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import thirdparty.ThumbHash
import kotlin.math.max

class ThumbhashModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Thumbhash")

    AsyncFunction("generateThumbHash", this@ThumbhashModule::generateThumbHash)
  }

  // region Function implementations

  private fun generateThumbHash(photoURI: Uri): String {
    val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      // For API >= 28 we can use the ImageDecoder API which is more modern
      // and allows to resize bitmap to desired size while loading the file
      val source = ImageDecoder.createSource(this.contentResolver, photoURI)
      ImageDecoder.decodeBitmap(source, this.decoderListener)
    } else {
      // For older devices, we use the BitmapFactory thing which is less
      // flexible, but at least we can request for the ARGB_8888 to avoid
      // future conversions. We rescale the bitmap afterwards
      val opts = BitmapFactory.Options().apply {
        inPreferredConfig = Bitmap.Config.ARGB_8888
      }
      this.contentResolver.openInputStream(photoURI).use { stream ->
        BitmapFactory.decodeStream(stream, null, opts)
      }?.let {
        // Thumbhash requires images that are max 100x100 pixels
        val w = 100 * it.width / max(it.width, it.height)
        val h = 100 * it.height / max(it.width, it.height)
        it.scale(w, h, filter = false)
      } ?: throw BitmapDecodeFailureException(photoURI.toString())
    }

    val rgba = bitmap.toRGBA()
    val thumbHash = ThumbHash.rgbaToThumbHash(bitmap.width, bitmap.height, rgba)
    return Base64.encodeToString(thumbHash, Base64.DEFAULT)
  }

  // endregion

  @RequiresApi(Build.VERSION_CODES.P)
  private val decoderListener =
    ImageDecoder.OnHeaderDecodedListener { imageDecoder, imageInfo, _ ->
      // Thumbhash requires images that are max 100x100 pixels
      val (w, h) = imageInfo.size
      val newWidth = 100 * w / max(w, h)
      val newHeight = 100 * h / max(w, h)
      // this usually defaults bitmap config to ARGB_8888
      imageDecoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
      imageDecoder.setTargetSize(newWidth, newHeight)
    }

  private val contentResolver: ContentResolver
    get() = requireNotNull(this.appContext.reactContext) {
      "React Application Context is null"
    }.contentResolver
}

// region Utility extension functions

fun Bitmap.toRGBA(): ByteArray {
  // ensure we're using the ARGB_8888 format
  val bitmap: Bitmap = when (this.config) {
      Bitmap.Config.ARGB_8888 -> this
      else -> this.copy(Bitmap.Config.ARGB_8888, false)
  }
  val pixels = IntArray(this.width * this.height).also {
    bitmap.getPixels(it, 0, this.width, 0, 0, this.width, this.height)
  }
  val bytes = ByteArray(pixels.size * 4)
  var i = 0
  for (pixel in pixels) {
    // Get components assuming is ARGB
    val a = pixel shr 24 and 0xff
    val r = pixel shr 16 and 0xff
    val g = pixel shr 8 and 0xff
    val b = pixel and 0xff
    bytes[i++] = r.toByte()
    bytes[i++] = g.toByte()
    bytes[i++] = b.toByte()
    bytes[i++] = a.toByte()
  }
  return bytes
}

// endregion

// region Exception definitions

private class BitmapDecodeFailureException(uri: String) :
  CodedException("Failed to decode Bitmap for URI: $uri")

// endregion

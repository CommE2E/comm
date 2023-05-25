package app.comm.android.utils

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.blob.BlobModule
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.records.Required
import expo.modules.kotlin.typedarray.TypedArray
import expo.modules.kotlin.typedarray.Uint8Array

// This type corresponds to the BlobData interface in react-native
class BlobMetadata: Record {
  @Required @Field val blobId: String = ""
  @Required @Field val size: Int = -1
  @Required @Field val offset: Int = 0
}

class BlobUtilsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BlobUtils")

    Function("copyBlobToTypedArray") { blob: BlobMetadata,
                                             destination: Uint8Array ->
      val blobBytes = blobManager.resolve(blob.blobId, blob.offset, blob.size)
        ?: throw NoSuchBlobException(blob.blobId)

      destination.write(blobBytes, 0, blob.size)
    }

    Function("blobFromTypedArray") { source: TypedArray ->
      val bytes = ByteArray(source.byteLength).also {
        source.read(it, 0, source.byteLength)
      }
      val blobID = blobManager.store(bytes)
        ?: throw BlobCreationFailedException()
      return@Function blobID
    }
  }

  private val reactContext
    get() = requireNotNull(
      this.appContext.reactContext as? ReactApplicationContext
    ) { "React context is null or is not a ReactApplicationContext" }

  private val blobManager: BlobModule
    get() = requireNotNull(
      this.reactContext.getNativeModule(BlobModule::class.java)
    ) { "Couldn't load react-native's BlobModule" }
}

// region Exception definitions

private class NoSuchBlobException(blobID: String) :
  CodedException("No blob data found for blob id=$blobID")

private class BlobCreationFailedException :
  CodedException("Failed to store blob")

// endregion

// @generated by the protocol buffer compiler.  DO NOT EDIT!
// source: blob.proto

#include "blob.pb.h"

#include <algorithm>

#include <google/protobuf/io/coded_stream.h>
#include <google/protobuf/extension_set.h>
#include <google/protobuf/wire_format_lite.h>
#include <google/protobuf/descriptor.h>
#include <google/protobuf/generated_message_reflection.h>
#include <google/protobuf/reflection_ops.h>
#include <google/protobuf/wire_format.h>
// @@protoc_insertion_point(includes)
#include <google/protobuf/port_def.inc>

PROTOBUF_PRAGMA_INIT_SEG
namespace blob {
constexpr PutRequest::PutRequest(
  ::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized)
  : _oneof_case_{}{}
struct PutRequestDefaultTypeInternal {
  constexpr PutRequestDefaultTypeInternal()
    : _instance(::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized{}) {}
  ~PutRequestDefaultTypeInternal() {}
  union {
    PutRequest _instance;
  };
};
PROTOBUF_ATTRIBUTE_NO_DESTROY PROTOBUF_CONSTINIT PutRequestDefaultTypeInternal _PutRequest_default_instance_;
constexpr GetRequest::GetRequest(
  ::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized)
  : reverseindex_(&::PROTOBUF_NAMESPACE_ID::internal::fixed_address_empty_string){}
struct GetRequestDefaultTypeInternal {
  constexpr GetRequestDefaultTypeInternal()
    : _instance(::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized{}) {}
  ~GetRequestDefaultTypeInternal() {}
  union {
    GetRequest _instance;
  };
};
PROTOBUF_ATTRIBUTE_NO_DESTROY PROTOBUF_CONSTINIT GetRequestDefaultTypeInternal _GetRequest_default_instance_;
constexpr GetResponse::GetResponse(
  ::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized)
  : datachunk_(&::PROTOBUF_NAMESPACE_ID::internal::fixed_address_empty_string){}
struct GetResponseDefaultTypeInternal {
  constexpr GetResponseDefaultTypeInternal()
    : _instance(::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized{}) {}
  ~GetResponseDefaultTypeInternal() {}
  union {
    GetResponse _instance;
  };
};
PROTOBUF_ATTRIBUTE_NO_DESTROY PROTOBUF_CONSTINIT GetResponseDefaultTypeInternal _GetResponse_default_instance_;
constexpr RemoveRequest::RemoveRequest(
  ::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized)
  : reverseindex_(&::PROTOBUF_NAMESPACE_ID::internal::fixed_address_empty_string){}
struct RemoveRequestDefaultTypeInternal {
  constexpr RemoveRequestDefaultTypeInternal()
    : _instance(::PROTOBUF_NAMESPACE_ID::internal::ConstantInitialized{}) {}
  ~RemoveRequestDefaultTypeInternal() {}
  union {
    RemoveRequest _instance;
  };
};
PROTOBUF_ATTRIBUTE_NO_DESTROY PROTOBUF_CONSTINIT RemoveRequestDefaultTypeInternal _RemoveRequest_default_instance_;
}  // namespace blob
static ::PROTOBUF_NAMESPACE_ID::Metadata file_level_metadata_blob_2eproto[4];
static constexpr ::PROTOBUF_NAMESPACE_ID::EnumDescriptor const** file_level_enum_descriptors_blob_2eproto = nullptr;
static constexpr ::PROTOBUF_NAMESPACE_ID::ServiceDescriptor const** file_level_service_descriptors_blob_2eproto = nullptr;

const ::PROTOBUF_NAMESPACE_ID::uint32 TableStruct_blob_2eproto::offsets[] PROTOBUF_SECTION_VARIABLE(protodesc_cold) = {
  ~0u,  // no _has_bits_
  PROTOBUF_FIELD_OFFSET(::blob::PutRequest, _internal_metadata_),
  ~0u,  // no _extensions_
  PROTOBUF_FIELD_OFFSET(::blob::PutRequest, _oneof_case_[0]),
  ~0u,  // no _weak_field_map_
  ::PROTOBUF_NAMESPACE_ID::internal::kInvalidFieldOffsetTag,
  ::PROTOBUF_NAMESPACE_ID::internal::kInvalidFieldOffsetTag,
  ::PROTOBUF_NAMESPACE_ID::internal::kInvalidFieldOffsetTag,
  PROTOBUF_FIELD_OFFSET(::blob::PutRequest, data_),
  ~0u,  // no _has_bits_
  PROTOBUF_FIELD_OFFSET(::blob::GetRequest, _internal_metadata_),
  ~0u,  // no _extensions_
  ~0u,  // no _oneof_case_
  ~0u,  // no _weak_field_map_
  PROTOBUF_FIELD_OFFSET(::blob::GetRequest, reverseindex_),
  ~0u,  // no _has_bits_
  PROTOBUF_FIELD_OFFSET(::blob::GetResponse, _internal_metadata_),
  ~0u,  // no _extensions_
  ~0u,  // no _oneof_case_
  ~0u,  // no _weak_field_map_
  PROTOBUF_FIELD_OFFSET(::blob::GetResponse, datachunk_),
  ~0u,  // no _has_bits_
  PROTOBUF_FIELD_OFFSET(::blob::RemoveRequest, _internal_metadata_),
  ~0u,  // no _extensions_
  ~0u,  // no _oneof_case_
  ~0u,  // no _weak_field_map_
  PROTOBUF_FIELD_OFFSET(::blob::RemoveRequest, reverseindex_),
};
static const ::PROTOBUF_NAMESPACE_ID::internal::MigrationSchema schemas[] PROTOBUF_SECTION_VARIABLE(protodesc_cold) = {
  { 0, -1, sizeof(::blob::PutRequest)},
  { 9, -1, sizeof(::blob::GetRequest)},
  { 15, -1, sizeof(::blob::GetResponse)},
  { 21, -1, sizeof(::blob::RemoveRequest)},
};

static ::PROTOBUF_NAMESPACE_ID::Message const * const file_default_instances[] = {
  reinterpret_cast<const ::PROTOBUF_NAMESPACE_ID::Message*>(&::blob::_PutRequest_default_instance_),
  reinterpret_cast<const ::PROTOBUF_NAMESPACE_ID::Message*>(&::blob::_GetRequest_default_instance_),
  reinterpret_cast<const ::PROTOBUF_NAMESPACE_ID::Message*>(&::blob::_GetResponse_default_instance_),
  reinterpret_cast<const ::PROTOBUF_NAMESPACE_ID::Message*>(&::blob::_RemoveRequest_default_instance_),
};

const char descriptor_table_protodef_blob_2eproto[] PROTOBUF_SECTION_VARIABLE(protodesc_cold) =
  "\n\nblob.proto\022\004blob\032\033google/protobuf/empt"
  "y.proto\"U\n\nPutRequest\022\026\n\014reverseIndex\030\001 "
  "\001(\tH\000\022\022\n\010fileHash\030\002 \001(\tH\000\022\023\n\tdataChunk\030\003"
  " \001(\014H\000B\006\n\004data\"\"\n\nGetRequest\022\024\n\014reverseI"
  "ndex\030\001 \001(\t\" \n\013GetResponse\022\021\n\tdataChunk\030\001"
  " \001(\014\"%\n\rRemoveRequest\022\024\n\014reverseIndex\030\001 "
  "\001(\t2\253\001\n\013BlobService\0223\n\003Put\022\020.blob.PutReq"
  "uest\032\026.google.protobuf.Empty\"\000(\001\022.\n\003Get\022"
  "\020.blob.GetRequest\032\021.blob.GetResponse\"\0000\001"
  "\0227\n\006Remove\022\023.blob.RemoveRequest\032\026.google"
  ".protobuf.Empty\"\000b\006proto3"
  ;
static const ::PROTOBUF_NAMESPACE_ID::internal::DescriptorTable*const descriptor_table_blob_2eproto_deps[1] = {
  &::descriptor_table_google_2fprotobuf_2fempty_2eproto,
};
static ::PROTOBUF_NAMESPACE_ID::internal::once_flag descriptor_table_blob_2eproto_once;
const ::PROTOBUF_NAMESPACE_ID::internal::DescriptorTable descriptor_table_blob_2eproto = {
  false, false, 425, descriptor_table_protodef_blob_2eproto, "blob.proto", 
  &descriptor_table_blob_2eproto_once, descriptor_table_blob_2eproto_deps, 1, 4,
  schemas, file_default_instances, TableStruct_blob_2eproto::offsets,
  file_level_metadata_blob_2eproto, file_level_enum_descriptors_blob_2eproto, file_level_service_descriptors_blob_2eproto,
};
PROTOBUF_ATTRIBUTE_WEAK ::PROTOBUF_NAMESPACE_ID::Metadata
descriptor_table_blob_2eproto_metadata_getter(int index) {
  ::PROTOBUF_NAMESPACE_ID::internal::AssignDescriptors(&descriptor_table_blob_2eproto);
  return descriptor_table_blob_2eproto.file_level_metadata[index];
}

// Force running AddDescriptors() at dynamic initialization time.
PROTOBUF_ATTRIBUTE_INIT_PRIORITY static ::PROTOBUF_NAMESPACE_ID::internal::AddDescriptorsRunner dynamic_init_dummy_blob_2eproto(&descriptor_table_blob_2eproto);
namespace blob {

// ===================================================================

class PutRequest::_Internal {
 public:
};

PutRequest::PutRequest(::PROTOBUF_NAMESPACE_ID::Arena* arena)
  : ::PROTOBUF_NAMESPACE_ID::Message(arena) {
  SharedCtor();
  RegisterArenaDtor(arena);
  // @@protoc_insertion_point(arena_constructor:blob.PutRequest)
}
PutRequest::PutRequest(const PutRequest& from)
  : ::PROTOBUF_NAMESPACE_ID::Message() {
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  clear_has_data();
  switch (from.data_case()) {
    case kReverseIndex: {
      _internal_set_reverseindex(from._internal_reverseindex());
      break;
    }
    case kFileHash: {
      _internal_set_filehash(from._internal_filehash());
      break;
    }
    case kDataChunk: {
      _internal_set_datachunk(from._internal_datachunk());
      break;
    }
    case DATA_NOT_SET: {
      break;
    }
  }
  // @@protoc_insertion_point(copy_constructor:blob.PutRequest)
}

void PutRequest::SharedCtor() {
clear_has_data();
}

PutRequest::~PutRequest() {
  // @@protoc_insertion_point(destructor:blob.PutRequest)
  SharedDtor();
  _internal_metadata_.Delete<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

void PutRequest::SharedDtor() {
  GOOGLE_DCHECK(GetArena() == nullptr);
  if (has_data()) {
    clear_data();
  }
}

void PutRequest::ArenaDtor(void* object) {
  PutRequest* _this = reinterpret_cast< PutRequest* >(object);
  (void)_this;
}
void PutRequest::RegisterArenaDtor(::PROTOBUF_NAMESPACE_ID::Arena*) {
}
void PutRequest::SetCachedSize(int size) const {
  _cached_size_.Set(size);
}

void PutRequest::clear_data() {
// @@protoc_insertion_point(one_of_clear_start:blob.PutRequest)
  switch (data_case()) {
    case kReverseIndex: {
      data_.reverseindex_.Destroy(::PROTOBUF_NAMESPACE_ID::internal::ArenaStringPtr::EmptyDefault{}, GetArena());
      break;
    }
    case kFileHash: {
      data_.filehash_.Destroy(::PROTOBUF_NAMESPACE_ID::internal::ArenaStringPtr::EmptyDefault{}, GetArena());
      break;
    }
    case kDataChunk: {
      data_.datachunk_.Destroy(::PROTOBUF_NAMESPACE_ID::internal::ArenaStringPtr::EmptyDefault{}, GetArena());
      break;
    }
    case DATA_NOT_SET: {
      break;
    }
  }
  _oneof_case_[0] = DATA_NOT_SET;
}


void PutRequest::Clear() {
// @@protoc_insertion_point(message_clear_start:blob.PutRequest)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  clear_data();
  _internal_metadata_.Clear<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

const char* PutRequest::_InternalParse(const char* ptr, ::PROTOBUF_NAMESPACE_ID::internal::ParseContext* ctx) {
#define CHK_(x) if (PROTOBUF_PREDICT_FALSE(!(x))) goto failure
  while (!ctx->Done(&ptr)) {
    ::PROTOBUF_NAMESPACE_ID::uint32 tag;
    ptr = ::PROTOBUF_NAMESPACE_ID::internal::ReadTag(ptr, &tag);
    CHK_(ptr);
    switch (tag >> 3) {
      // string reverseIndex = 1;
      case 1:
        if (PROTOBUF_PREDICT_TRUE(static_cast<::PROTOBUF_NAMESPACE_ID::uint8>(tag) == 10)) {
          auto str = _internal_mutable_reverseindex();
          ptr = ::PROTOBUF_NAMESPACE_ID::internal::InlineGreedyStringParser(str, ptr, ctx);
          CHK_(::PROTOBUF_NAMESPACE_ID::internal::VerifyUTF8(str, "blob.PutRequest.reverseIndex"));
          CHK_(ptr);
        } else goto handle_unusual;
        continue;
      // string fileHash = 2;
      case 2:
        if (PROTOBUF_PREDICT_TRUE(static_cast<::PROTOBUF_NAMESPACE_ID::uint8>(tag) == 18)) {
          auto str = _internal_mutable_filehash();
          ptr = ::PROTOBUF_NAMESPACE_ID::internal::InlineGreedyStringParser(str, ptr, ctx);
          CHK_(::PROTOBUF_NAMESPACE_ID::internal::VerifyUTF8(str, "blob.PutRequest.fileHash"));
          CHK_(ptr);
        } else goto handle_unusual;
        continue;
      // bytes dataChunk = 3;
      case 3:
        if (PROTOBUF_PREDICT_TRUE(static_cast<::PROTOBUF_NAMESPACE_ID::uint8>(tag) == 26)) {
          auto str = _internal_mutable_datachunk();
          ptr = ::PROTOBUF_NAMESPACE_ID::internal::InlineGreedyStringParser(str, ptr, ctx);
          CHK_(ptr);
        } else goto handle_unusual;
        continue;
      default: {
      handle_unusual:
        if ((tag & 7) == 4 || tag == 0) {
          ctx->SetLastTag(tag);
          goto success;
        }
        ptr = UnknownFieldParse(tag,
            _internal_metadata_.mutable_unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(),
            ptr, ctx);
        CHK_(ptr != nullptr);
        continue;
      }
    }  // switch
  }  // while
success:
  return ptr;
failure:
  ptr = nullptr;
  goto success;
#undef CHK_
}

::PROTOBUF_NAMESPACE_ID::uint8* PutRequest::_InternalSerialize(
    ::PROTOBUF_NAMESPACE_ID::uint8* target, ::PROTOBUF_NAMESPACE_ID::io::EpsCopyOutputStream* stream) const {
  // @@protoc_insertion_point(serialize_to_array_start:blob.PutRequest)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  // string reverseIndex = 1;
  if (_internal_has_reverseindex()) {
    ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::VerifyUtf8String(
      this->_internal_reverseindex().data(), static_cast<int>(this->_internal_reverseindex().length()),
      ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::SERIALIZE,
      "blob.PutRequest.reverseIndex");
    target = stream->WriteStringMaybeAliased(
        1, this->_internal_reverseindex(), target);
  }

  // string fileHash = 2;
  if (_internal_has_filehash()) {
    ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::VerifyUtf8String(
      this->_internal_filehash().data(), static_cast<int>(this->_internal_filehash().length()),
      ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::SERIALIZE,
      "blob.PutRequest.fileHash");
    target = stream->WriteStringMaybeAliased(
        2, this->_internal_filehash(), target);
  }

  // bytes dataChunk = 3;
  if (_internal_has_datachunk()) {
    target = stream->WriteBytesMaybeAliased(
        3, this->_internal_datachunk(), target);
  }

  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    target = ::PROTOBUF_NAMESPACE_ID::internal::WireFormat::InternalSerializeUnknownFieldsToArray(
        _internal_metadata_.unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(::PROTOBUF_NAMESPACE_ID::UnknownFieldSet::default_instance), target, stream);
  }
  // @@protoc_insertion_point(serialize_to_array_end:blob.PutRequest)
  return target;
}

size_t PutRequest::ByteSizeLong() const {
// @@protoc_insertion_point(message_byte_size_start:blob.PutRequest)
  size_t total_size = 0;

  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  switch (data_case()) {
    // string reverseIndex = 1;
    case kReverseIndex: {
      total_size += 1 +
        ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::StringSize(
          this->_internal_reverseindex());
      break;
    }
    // string fileHash = 2;
    case kFileHash: {
      total_size += 1 +
        ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::StringSize(
          this->_internal_filehash());
      break;
    }
    // bytes dataChunk = 3;
    case kDataChunk: {
      total_size += 1 +
        ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::BytesSize(
          this->_internal_datachunk());
      break;
    }
    case DATA_NOT_SET: {
      break;
    }
  }
  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    return ::PROTOBUF_NAMESPACE_ID::internal::ComputeUnknownFieldsSize(
        _internal_metadata_, total_size, &_cached_size_);
  }
  int cached_size = ::PROTOBUF_NAMESPACE_ID::internal::ToCachedSize(total_size);
  SetCachedSize(cached_size);
  return total_size;
}

void PutRequest::MergeFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_merge_from_start:blob.PutRequest)
  GOOGLE_DCHECK_NE(&from, this);
  const PutRequest* source =
      ::PROTOBUF_NAMESPACE_ID::DynamicCastToGenerated<PutRequest>(
          &from);
  if (source == nullptr) {
  // @@protoc_insertion_point(generalized_merge_from_cast_fail:blob.PutRequest)
    ::PROTOBUF_NAMESPACE_ID::internal::ReflectionOps::Merge(from, this);
  } else {
  // @@protoc_insertion_point(generalized_merge_from_cast_success:blob.PutRequest)
    MergeFrom(*source);
  }
}

void PutRequest::MergeFrom(const PutRequest& from) {
// @@protoc_insertion_point(class_specific_merge_from_start:blob.PutRequest)
  GOOGLE_DCHECK_NE(&from, this);
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  switch (from.data_case()) {
    case kReverseIndex: {
      _internal_set_reverseindex(from._internal_reverseindex());
      break;
    }
    case kFileHash: {
      _internal_set_filehash(from._internal_filehash());
      break;
    }
    case kDataChunk: {
      _internal_set_datachunk(from._internal_datachunk());
      break;
    }
    case DATA_NOT_SET: {
      break;
    }
  }
}

void PutRequest::CopyFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_copy_from_start:blob.PutRequest)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

void PutRequest::CopyFrom(const PutRequest& from) {
// @@protoc_insertion_point(class_specific_copy_from_start:blob.PutRequest)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

bool PutRequest::IsInitialized() const {
  return true;
}

void PutRequest::InternalSwap(PutRequest* other) {
  using std::swap;
  _internal_metadata_.Swap<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(&other->_internal_metadata_);
  swap(data_, other->data_);
  swap(_oneof_case_[0], other->_oneof_case_[0]);
}

::PROTOBUF_NAMESPACE_ID::Metadata PutRequest::GetMetadata() const {
  return GetMetadataStatic();
}


// ===================================================================

class GetRequest::_Internal {
 public:
};

GetRequest::GetRequest(::PROTOBUF_NAMESPACE_ID::Arena* arena)
  : ::PROTOBUF_NAMESPACE_ID::Message(arena) {
  SharedCtor();
  RegisterArenaDtor(arena);
  // @@protoc_insertion_point(arena_constructor:blob.GetRequest)
}
GetRequest::GetRequest(const GetRequest& from)
  : ::PROTOBUF_NAMESPACE_ID::Message() {
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  reverseindex_.UnsafeSetDefault(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
  if (!from._internal_reverseindex().empty()) {
    reverseindex_.Set(::PROTOBUF_NAMESPACE_ID::internal::ArenaStringPtr::EmptyDefault{}, from._internal_reverseindex(), 
      GetArena());
  }
  // @@protoc_insertion_point(copy_constructor:blob.GetRequest)
}

void GetRequest::SharedCtor() {
reverseindex_.UnsafeSetDefault(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
}

GetRequest::~GetRequest() {
  // @@protoc_insertion_point(destructor:blob.GetRequest)
  SharedDtor();
  _internal_metadata_.Delete<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

void GetRequest::SharedDtor() {
  GOOGLE_DCHECK(GetArena() == nullptr);
  reverseindex_.DestroyNoArena(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
}

void GetRequest::ArenaDtor(void* object) {
  GetRequest* _this = reinterpret_cast< GetRequest* >(object);
  (void)_this;
}
void GetRequest::RegisterArenaDtor(::PROTOBUF_NAMESPACE_ID::Arena*) {
}
void GetRequest::SetCachedSize(int size) const {
  _cached_size_.Set(size);
}

void GetRequest::Clear() {
// @@protoc_insertion_point(message_clear_start:blob.GetRequest)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  reverseindex_.ClearToEmpty();
  _internal_metadata_.Clear<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

const char* GetRequest::_InternalParse(const char* ptr, ::PROTOBUF_NAMESPACE_ID::internal::ParseContext* ctx) {
#define CHK_(x) if (PROTOBUF_PREDICT_FALSE(!(x))) goto failure
  while (!ctx->Done(&ptr)) {
    ::PROTOBUF_NAMESPACE_ID::uint32 tag;
    ptr = ::PROTOBUF_NAMESPACE_ID::internal::ReadTag(ptr, &tag);
    CHK_(ptr);
    switch (tag >> 3) {
      // string reverseIndex = 1;
      case 1:
        if (PROTOBUF_PREDICT_TRUE(static_cast<::PROTOBUF_NAMESPACE_ID::uint8>(tag) == 10)) {
          auto str = _internal_mutable_reverseindex();
          ptr = ::PROTOBUF_NAMESPACE_ID::internal::InlineGreedyStringParser(str, ptr, ctx);
          CHK_(::PROTOBUF_NAMESPACE_ID::internal::VerifyUTF8(str, "blob.GetRequest.reverseIndex"));
          CHK_(ptr);
        } else goto handle_unusual;
        continue;
      default: {
      handle_unusual:
        if ((tag & 7) == 4 || tag == 0) {
          ctx->SetLastTag(tag);
          goto success;
        }
        ptr = UnknownFieldParse(tag,
            _internal_metadata_.mutable_unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(),
            ptr, ctx);
        CHK_(ptr != nullptr);
        continue;
      }
    }  // switch
  }  // while
success:
  return ptr;
failure:
  ptr = nullptr;
  goto success;
#undef CHK_
}

::PROTOBUF_NAMESPACE_ID::uint8* GetRequest::_InternalSerialize(
    ::PROTOBUF_NAMESPACE_ID::uint8* target, ::PROTOBUF_NAMESPACE_ID::io::EpsCopyOutputStream* stream) const {
  // @@protoc_insertion_point(serialize_to_array_start:blob.GetRequest)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  // string reverseIndex = 1;
  if (this->reverseindex().size() > 0) {
    ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::VerifyUtf8String(
      this->_internal_reverseindex().data(), static_cast<int>(this->_internal_reverseindex().length()),
      ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::SERIALIZE,
      "blob.GetRequest.reverseIndex");
    target = stream->WriteStringMaybeAliased(
        1, this->_internal_reverseindex(), target);
  }

  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    target = ::PROTOBUF_NAMESPACE_ID::internal::WireFormat::InternalSerializeUnknownFieldsToArray(
        _internal_metadata_.unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(::PROTOBUF_NAMESPACE_ID::UnknownFieldSet::default_instance), target, stream);
  }
  // @@protoc_insertion_point(serialize_to_array_end:blob.GetRequest)
  return target;
}

size_t GetRequest::ByteSizeLong() const {
// @@protoc_insertion_point(message_byte_size_start:blob.GetRequest)
  size_t total_size = 0;

  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  // string reverseIndex = 1;
  if (this->reverseindex().size() > 0) {
    total_size += 1 +
      ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::StringSize(
        this->_internal_reverseindex());
  }

  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    return ::PROTOBUF_NAMESPACE_ID::internal::ComputeUnknownFieldsSize(
        _internal_metadata_, total_size, &_cached_size_);
  }
  int cached_size = ::PROTOBUF_NAMESPACE_ID::internal::ToCachedSize(total_size);
  SetCachedSize(cached_size);
  return total_size;
}

void GetRequest::MergeFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_merge_from_start:blob.GetRequest)
  GOOGLE_DCHECK_NE(&from, this);
  const GetRequest* source =
      ::PROTOBUF_NAMESPACE_ID::DynamicCastToGenerated<GetRequest>(
          &from);
  if (source == nullptr) {
  // @@protoc_insertion_point(generalized_merge_from_cast_fail:blob.GetRequest)
    ::PROTOBUF_NAMESPACE_ID::internal::ReflectionOps::Merge(from, this);
  } else {
  // @@protoc_insertion_point(generalized_merge_from_cast_success:blob.GetRequest)
    MergeFrom(*source);
  }
}

void GetRequest::MergeFrom(const GetRequest& from) {
// @@protoc_insertion_point(class_specific_merge_from_start:blob.GetRequest)
  GOOGLE_DCHECK_NE(&from, this);
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  if (from.reverseindex().size() > 0) {
    _internal_set_reverseindex(from._internal_reverseindex());
  }
}

void GetRequest::CopyFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_copy_from_start:blob.GetRequest)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

void GetRequest::CopyFrom(const GetRequest& from) {
// @@protoc_insertion_point(class_specific_copy_from_start:blob.GetRequest)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

bool GetRequest::IsInitialized() const {
  return true;
}

void GetRequest::InternalSwap(GetRequest* other) {
  using std::swap;
  _internal_metadata_.Swap<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(&other->_internal_metadata_);
  reverseindex_.Swap(&other->reverseindex_, &::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited(), GetArena());
}

::PROTOBUF_NAMESPACE_ID::Metadata GetRequest::GetMetadata() const {
  return GetMetadataStatic();
}


// ===================================================================

class GetResponse::_Internal {
 public:
};

GetResponse::GetResponse(::PROTOBUF_NAMESPACE_ID::Arena* arena)
  : ::PROTOBUF_NAMESPACE_ID::Message(arena) {
  SharedCtor();
  RegisterArenaDtor(arena);
  // @@protoc_insertion_point(arena_constructor:blob.GetResponse)
}
GetResponse::GetResponse(const GetResponse& from)
  : ::PROTOBUF_NAMESPACE_ID::Message() {
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  datachunk_.UnsafeSetDefault(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
  if (!from._internal_datachunk().empty()) {
    datachunk_.Set(::PROTOBUF_NAMESPACE_ID::internal::ArenaStringPtr::EmptyDefault{}, from._internal_datachunk(), 
      GetArena());
  }
  // @@protoc_insertion_point(copy_constructor:blob.GetResponse)
}

void GetResponse::SharedCtor() {
datachunk_.UnsafeSetDefault(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
}

GetResponse::~GetResponse() {
  // @@protoc_insertion_point(destructor:blob.GetResponse)
  SharedDtor();
  _internal_metadata_.Delete<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

void GetResponse::SharedDtor() {
  GOOGLE_DCHECK(GetArena() == nullptr);
  datachunk_.DestroyNoArena(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
}

void GetResponse::ArenaDtor(void* object) {
  GetResponse* _this = reinterpret_cast< GetResponse* >(object);
  (void)_this;
}
void GetResponse::RegisterArenaDtor(::PROTOBUF_NAMESPACE_ID::Arena*) {
}
void GetResponse::SetCachedSize(int size) const {
  _cached_size_.Set(size);
}

void GetResponse::Clear() {
// @@protoc_insertion_point(message_clear_start:blob.GetResponse)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  datachunk_.ClearToEmpty();
  _internal_metadata_.Clear<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

const char* GetResponse::_InternalParse(const char* ptr, ::PROTOBUF_NAMESPACE_ID::internal::ParseContext* ctx) {
#define CHK_(x) if (PROTOBUF_PREDICT_FALSE(!(x))) goto failure
  while (!ctx->Done(&ptr)) {
    ::PROTOBUF_NAMESPACE_ID::uint32 tag;
    ptr = ::PROTOBUF_NAMESPACE_ID::internal::ReadTag(ptr, &tag);
    CHK_(ptr);
    switch (tag >> 3) {
      // bytes dataChunk = 1;
      case 1:
        if (PROTOBUF_PREDICT_TRUE(static_cast<::PROTOBUF_NAMESPACE_ID::uint8>(tag) == 10)) {
          auto str = _internal_mutable_datachunk();
          ptr = ::PROTOBUF_NAMESPACE_ID::internal::InlineGreedyStringParser(str, ptr, ctx);
          CHK_(ptr);
        } else goto handle_unusual;
        continue;
      default: {
      handle_unusual:
        if ((tag & 7) == 4 || tag == 0) {
          ctx->SetLastTag(tag);
          goto success;
        }
        ptr = UnknownFieldParse(tag,
            _internal_metadata_.mutable_unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(),
            ptr, ctx);
        CHK_(ptr != nullptr);
        continue;
      }
    }  // switch
  }  // while
success:
  return ptr;
failure:
  ptr = nullptr;
  goto success;
#undef CHK_
}

::PROTOBUF_NAMESPACE_ID::uint8* GetResponse::_InternalSerialize(
    ::PROTOBUF_NAMESPACE_ID::uint8* target, ::PROTOBUF_NAMESPACE_ID::io::EpsCopyOutputStream* stream) const {
  // @@protoc_insertion_point(serialize_to_array_start:blob.GetResponse)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  // bytes dataChunk = 1;
  if (this->datachunk().size() > 0) {
    target = stream->WriteBytesMaybeAliased(
        1, this->_internal_datachunk(), target);
  }

  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    target = ::PROTOBUF_NAMESPACE_ID::internal::WireFormat::InternalSerializeUnknownFieldsToArray(
        _internal_metadata_.unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(::PROTOBUF_NAMESPACE_ID::UnknownFieldSet::default_instance), target, stream);
  }
  // @@protoc_insertion_point(serialize_to_array_end:blob.GetResponse)
  return target;
}

size_t GetResponse::ByteSizeLong() const {
// @@protoc_insertion_point(message_byte_size_start:blob.GetResponse)
  size_t total_size = 0;

  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  // bytes dataChunk = 1;
  if (this->datachunk().size() > 0) {
    total_size += 1 +
      ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::BytesSize(
        this->_internal_datachunk());
  }

  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    return ::PROTOBUF_NAMESPACE_ID::internal::ComputeUnknownFieldsSize(
        _internal_metadata_, total_size, &_cached_size_);
  }
  int cached_size = ::PROTOBUF_NAMESPACE_ID::internal::ToCachedSize(total_size);
  SetCachedSize(cached_size);
  return total_size;
}

void GetResponse::MergeFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_merge_from_start:blob.GetResponse)
  GOOGLE_DCHECK_NE(&from, this);
  const GetResponse* source =
      ::PROTOBUF_NAMESPACE_ID::DynamicCastToGenerated<GetResponse>(
          &from);
  if (source == nullptr) {
  // @@protoc_insertion_point(generalized_merge_from_cast_fail:blob.GetResponse)
    ::PROTOBUF_NAMESPACE_ID::internal::ReflectionOps::Merge(from, this);
  } else {
  // @@protoc_insertion_point(generalized_merge_from_cast_success:blob.GetResponse)
    MergeFrom(*source);
  }
}

void GetResponse::MergeFrom(const GetResponse& from) {
// @@protoc_insertion_point(class_specific_merge_from_start:blob.GetResponse)
  GOOGLE_DCHECK_NE(&from, this);
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  if (from.datachunk().size() > 0) {
    _internal_set_datachunk(from._internal_datachunk());
  }
}

void GetResponse::CopyFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_copy_from_start:blob.GetResponse)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

void GetResponse::CopyFrom(const GetResponse& from) {
// @@protoc_insertion_point(class_specific_copy_from_start:blob.GetResponse)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

bool GetResponse::IsInitialized() const {
  return true;
}

void GetResponse::InternalSwap(GetResponse* other) {
  using std::swap;
  _internal_metadata_.Swap<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(&other->_internal_metadata_);
  datachunk_.Swap(&other->datachunk_, &::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited(), GetArena());
}

::PROTOBUF_NAMESPACE_ID::Metadata GetResponse::GetMetadata() const {
  return GetMetadataStatic();
}


// ===================================================================

class RemoveRequest::_Internal {
 public:
};

RemoveRequest::RemoveRequest(::PROTOBUF_NAMESPACE_ID::Arena* arena)
  : ::PROTOBUF_NAMESPACE_ID::Message(arena) {
  SharedCtor();
  RegisterArenaDtor(arena);
  // @@protoc_insertion_point(arena_constructor:blob.RemoveRequest)
}
RemoveRequest::RemoveRequest(const RemoveRequest& from)
  : ::PROTOBUF_NAMESPACE_ID::Message() {
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  reverseindex_.UnsafeSetDefault(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
  if (!from._internal_reverseindex().empty()) {
    reverseindex_.Set(::PROTOBUF_NAMESPACE_ID::internal::ArenaStringPtr::EmptyDefault{}, from._internal_reverseindex(), 
      GetArena());
  }
  // @@protoc_insertion_point(copy_constructor:blob.RemoveRequest)
}

void RemoveRequest::SharedCtor() {
reverseindex_.UnsafeSetDefault(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
}

RemoveRequest::~RemoveRequest() {
  // @@protoc_insertion_point(destructor:blob.RemoveRequest)
  SharedDtor();
  _internal_metadata_.Delete<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

void RemoveRequest::SharedDtor() {
  GOOGLE_DCHECK(GetArena() == nullptr);
  reverseindex_.DestroyNoArena(&::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited());
}

void RemoveRequest::ArenaDtor(void* object) {
  RemoveRequest* _this = reinterpret_cast< RemoveRequest* >(object);
  (void)_this;
}
void RemoveRequest::RegisterArenaDtor(::PROTOBUF_NAMESPACE_ID::Arena*) {
}
void RemoveRequest::SetCachedSize(int size) const {
  _cached_size_.Set(size);
}

void RemoveRequest::Clear() {
// @@protoc_insertion_point(message_clear_start:blob.RemoveRequest)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  reverseindex_.ClearToEmpty();
  _internal_metadata_.Clear<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>();
}

const char* RemoveRequest::_InternalParse(const char* ptr, ::PROTOBUF_NAMESPACE_ID::internal::ParseContext* ctx) {
#define CHK_(x) if (PROTOBUF_PREDICT_FALSE(!(x))) goto failure
  while (!ctx->Done(&ptr)) {
    ::PROTOBUF_NAMESPACE_ID::uint32 tag;
    ptr = ::PROTOBUF_NAMESPACE_ID::internal::ReadTag(ptr, &tag);
    CHK_(ptr);
    switch (tag >> 3) {
      // string reverseIndex = 1;
      case 1:
        if (PROTOBUF_PREDICT_TRUE(static_cast<::PROTOBUF_NAMESPACE_ID::uint8>(tag) == 10)) {
          auto str = _internal_mutable_reverseindex();
          ptr = ::PROTOBUF_NAMESPACE_ID::internal::InlineGreedyStringParser(str, ptr, ctx);
          CHK_(::PROTOBUF_NAMESPACE_ID::internal::VerifyUTF8(str, "blob.RemoveRequest.reverseIndex"));
          CHK_(ptr);
        } else goto handle_unusual;
        continue;
      default: {
      handle_unusual:
        if ((tag & 7) == 4 || tag == 0) {
          ctx->SetLastTag(tag);
          goto success;
        }
        ptr = UnknownFieldParse(tag,
            _internal_metadata_.mutable_unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(),
            ptr, ctx);
        CHK_(ptr != nullptr);
        continue;
      }
    }  // switch
  }  // while
success:
  return ptr;
failure:
  ptr = nullptr;
  goto success;
#undef CHK_
}

::PROTOBUF_NAMESPACE_ID::uint8* RemoveRequest::_InternalSerialize(
    ::PROTOBUF_NAMESPACE_ID::uint8* target, ::PROTOBUF_NAMESPACE_ID::io::EpsCopyOutputStream* stream) const {
  // @@protoc_insertion_point(serialize_to_array_start:blob.RemoveRequest)
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  // string reverseIndex = 1;
  if (this->reverseindex().size() > 0) {
    ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::VerifyUtf8String(
      this->_internal_reverseindex().data(), static_cast<int>(this->_internal_reverseindex().length()),
      ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::SERIALIZE,
      "blob.RemoveRequest.reverseIndex");
    target = stream->WriteStringMaybeAliased(
        1, this->_internal_reverseindex(), target);
  }

  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    target = ::PROTOBUF_NAMESPACE_ID::internal::WireFormat::InternalSerializeUnknownFieldsToArray(
        _internal_metadata_.unknown_fields<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(::PROTOBUF_NAMESPACE_ID::UnknownFieldSet::default_instance), target, stream);
  }
  // @@protoc_insertion_point(serialize_to_array_end:blob.RemoveRequest)
  return target;
}

size_t RemoveRequest::ByteSizeLong() const {
// @@protoc_insertion_point(message_byte_size_start:blob.RemoveRequest)
  size_t total_size = 0;

  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  // Prevent compiler warnings about cached_has_bits being unused
  (void) cached_has_bits;

  // string reverseIndex = 1;
  if (this->reverseindex().size() > 0) {
    total_size += 1 +
      ::PROTOBUF_NAMESPACE_ID::internal::WireFormatLite::StringSize(
        this->_internal_reverseindex());
  }

  if (PROTOBUF_PREDICT_FALSE(_internal_metadata_.have_unknown_fields())) {
    return ::PROTOBUF_NAMESPACE_ID::internal::ComputeUnknownFieldsSize(
        _internal_metadata_, total_size, &_cached_size_);
  }
  int cached_size = ::PROTOBUF_NAMESPACE_ID::internal::ToCachedSize(total_size);
  SetCachedSize(cached_size);
  return total_size;
}

void RemoveRequest::MergeFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_merge_from_start:blob.RemoveRequest)
  GOOGLE_DCHECK_NE(&from, this);
  const RemoveRequest* source =
      ::PROTOBUF_NAMESPACE_ID::DynamicCastToGenerated<RemoveRequest>(
          &from);
  if (source == nullptr) {
  // @@protoc_insertion_point(generalized_merge_from_cast_fail:blob.RemoveRequest)
    ::PROTOBUF_NAMESPACE_ID::internal::ReflectionOps::Merge(from, this);
  } else {
  // @@protoc_insertion_point(generalized_merge_from_cast_success:blob.RemoveRequest)
    MergeFrom(*source);
  }
}

void RemoveRequest::MergeFrom(const RemoveRequest& from) {
// @@protoc_insertion_point(class_specific_merge_from_start:blob.RemoveRequest)
  GOOGLE_DCHECK_NE(&from, this);
  _internal_metadata_.MergeFrom<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(from._internal_metadata_);
  ::PROTOBUF_NAMESPACE_ID::uint32 cached_has_bits = 0;
  (void) cached_has_bits;

  if (from.reverseindex().size() > 0) {
    _internal_set_reverseindex(from._internal_reverseindex());
  }
}

void RemoveRequest::CopyFrom(const ::PROTOBUF_NAMESPACE_ID::Message& from) {
// @@protoc_insertion_point(generalized_copy_from_start:blob.RemoveRequest)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

void RemoveRequest::CopyFrom(const RemoveRequest& from) {
// @@protoc_insertion_point(class_specific_copy_from_start:blob.RemoveRequest)
  if (&from == this) return;
  Clear();
  MergeFrom(from);
}

bool RemoveRequest::IsInitialized() const {
  return true;
}

void RemoveRequest::InternalSwap(RemoveRequest* other) {
  using std::swap;
  _internal_metadata_.Swap<::PROTOBUF_NAMESPACE_ID::UnknownFieldSet>(&other->_internal_metadata_);
  reverseindex_.Swap(&other->reverseindex_, &::PROTOBUF_NAMESPACE_ID::internal::GetEmptyStringAlreadyInited(), GetArena());
}

::PROTOBUF_NAMESPACE_ID::Metadata RemoveRequest::GetMetadata() const {
  return GetMetadataStatic();
}


// @@protoc_insertion_point(namespace_scope)
}  // namespace blob
PROTOBUF_NAMESPACE_OPEN
template<> PROTOBUF_NOINLINE ::blob::PutRequest* Arena::CreateMaybeMessage< ::blob::PutRequest >(Arena* arena) {
  return Arena::CreateMessageInternal< ::blob::PutRequest >(arena);
}
template<> PROTOBUF_NOINLINE ::blob::GetRequest* Arena::CreateMaybeMessage< ::blob::GetRequest >(Arena* arena) {
  return Arena::CreateMessageInternal< ::blob::GetRequest >(arena);
}
template<> PROTOBUF_NOINLINE ::blob::GetResponse* Arena::CreateMaybeMessage< ::blob::GetResponse >(Arena* arena) {
  return Arena::CreateMessageInternal< ::blob::GetResponse >(arena);
}
template<> PROTOBUF_NOINLINE ::blob::RemoveRequest* Arena::CreateMaybeMessage< ::blob::RemoveRequest >(Arena* arena) {
  return Arena::CreateMessageInternal< ::blob::RemoveRequest >(arena);
}
PROTOBUF_NAMESPACE_CLOSE

// @@protoc_insertion_point(global_scope)
#include <google/protobuf/port_undef.inc>

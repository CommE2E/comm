#pragma once

#include "GlobalConstants.h"
#include "S3Tools.h"
#include "ServerWriteReactorBase.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <aws/s3/model/GetObjectRequest.h>

#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class GetReactor
    : public ServerWriteReactorBase<blob::GetRequest, blob::GetResponse> {
  size_t offset = 0;
  size_t fileSize = 0;
  const size_t chunkSize =
      GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE;
  database::S3Path s3Path;
  Aws::S3::Model::GetObjectRequest getRequest;

public:
  using ServerWriteReactorBase<blob::GetRequest, blob::GetResponse>::
      ServerWriteReactorBase;

  std::unique_ptr<grpc::Status>
  writeResponse(blob::GetResponse *response) override {
    LOG(INFO) << "[GetReactor::writeResponse] offset " << this->offset;
    LOG(INFO) << "[GetReactor::writeResponse] fileSize " << this->fileSize;
    if (this->offset >= this->fileSize) {
      return std::make_unique<grpc::Status>(grpc::Status::OK);
    }

    const size_t nextSize =
        std::min(this->chunkSize, this->fileSize - this->offset);
    LOG(INFO) << "[GetReactor::writeResponse] nextSize " << nextSize;

    std::string range = "bytes=" + std::to_string(this->offset) + "-" +
        std::to_string(this->offset + nextSize - 1);
    LOG(INFO) << "[GetReactor::writeResponse] range " << range;
    this->getRequest.SetRange(range);

    Aws::S3::Model::GetObjectOutcome getOutcome =
        getS3Client()->GetObject(this->getRequest);
    if (!getOutcome.IsSuccess()) {
      return std::make_unique<grpc::Status>(
          grpc::StatusCode::INTERNAL, getOutcome.GetError().GetMessage());
    }

    Aws::IOStream &retrievedFile =
        getOutcome.GetResultWithOwnership().GetBody();

    std::stringstream buffer;
    buffer << retrievedFile.rdbuf();
    std::string result(buffer.str());
    response->set_datachunk(result);
    LOG(INFO) << "[GetReactor::writeResponse] data chunk size "
              << result.size();

    this->offset += nextSize;
    LOG(INFO) << "[GetReactor::writeResponse] new offset " << this->offset;
    return nullptr;
  }

  void initialize() override {
    LOG(INFO) << "[GetReactor::initialize]";
    this->s3Path = tools::findS3Path(this->request.holder());
    this->fileSize =
        getBucket(s3Path.getBucketName()).getObjectSize(s3Path.getObjectName());
    LOG(INFO) << "[GetReactor::initialize] file size " << this->fileSize;

    this->getRequest.SetBucket(this->s3Path.getBucketName());
    this->getRequest.SetKey(this->s3Path.getObjectName());

    AwsS3Bucket bucket = getBucket(this->s3Path.getBucketName());
    if (!bucket.isAvailable()) {
      throw std::runtime_error(
          "bucket [" + this->s3Path.getBucketName() + "] not available");
    }
    const size_t fileSize = bucket.getObjectSize(this->s3Path.getObjectName());
    if (this->fileSize == 0) {
      throw std::runtime_error("object empty");
    }
  };

  void doneCallback() override{};
};

} // namespace reactor
} // namespace network
} // namespace comm

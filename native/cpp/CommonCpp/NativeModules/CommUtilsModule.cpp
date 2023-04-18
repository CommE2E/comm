#include "CommUtilsModule.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <fstream>
#include <string>

namespace comm {

using namespace facebook::react;

CommUtilsModule::CommUtilsModule(std::shared_ptr<CallInvoker> jsInvoker)
    : CommUtilsModuleSchemaCxxSpecJSI(jsInvoker),
      utilsThread(std::make_unique<WorkerThread>("utils")) {
}

jsi::Value CommUtilsModule::writeBufferToFile(
    jsi::Runtime &rt,
    jsi::String path,
    jsi::Object data) {
  auto arrayBuffer = data.getArrayBuffer(rt);
  auto size = arrayBuffer.size(rt);
  auto dataPtr = arrayBuffer.data(rt);
  auto filePath = path.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            std::ofstream file;
            file.exceptions(std::fstream::failbit | std::fstream::badbit);
            file.open(filePath, std::ios::binary);
            file.write((char *)dataPtr, size);
            file.close();
          } catch (const std::exception &e) {
            error = "Failed to write file " + filePath + ": " + e.what();
          }

          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        this->utilsThread->scheduleTask(job);
      });
}

jsi::Value
CommUtilsModule::readBufferFromFile(jsi::Runtime &rt, jsi::String path) {
  auto filePath = path.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::streampos file_size;
          std::shared_ptr<uint8_t> data{nullptr};
          try {
            // Open a file
            std::ifstream file;
            file.exceptions(std::fstream::failbit | std::fstream::badbit);
            file.open(filePath, std::ios::binary);

            // Get file size
            std::streampos current_pos = file.tellg();
            file.seekg(0, std::ios::end);
            file_size = file.tellg();
            file.seekg(current_pos);

            // Read file content
            data = std::shared_ptr<uint8_t>{new uint8_t[file_size]};
            file.read((char *)data.get(), file_size);
            file.close();
          } catch (const std::exception &e) {
            error = "Failed to read file " + filePath + ": " + e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto arrayBuffer =
                innerRt.global()
                    .getPropertyAsFunction(innerRt, "ArrayBuffer")
                    // ArrayBuffer constructor takes one parameter: byte length
                    .callAsConstructor(
                        innerRt, {static_cast<double>(file_size)})
                    .asObject(innerRt)
                    .getArrayBuffer(innerRt);
            auto bufferPtr = arrayBuffer.data(innerRt);
            memcpy((void *)bufferPtr, data.get(), file_size);
            promise->resolve(std::move(arrayBuffer));
          });
        };
        this->utilsThread->scheduleTask(job);
      });
}

jsi::String
CommUtilsModule::base64EncodeBuffer(jsi::Runtime &rt, jsi::Object data) {
  return jsi::String::createFromAscii(rt, "unimplemented");
}

} // namespace comm

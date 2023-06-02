#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <unordered_map>

namespace comm {

namespace jsi = facebook::jsi;

class CommConstants : public jsi::HostObject {
private:
  std::unordered_map<std::string, std::unique_ptr<jsi::Object>> constantsCache;
  jsi::Array prepareNativeMessageTypesArray(jsi::Runtime &rt);

public:
  CommConstants();
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override;
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;
};
} // namespace comm

#pragma once

#include <jsi/jsi.h>

namespace comm {

namespace jsi = facebook::jsi;

class CommConstants : public jsi::HostObject {
private:
  jsi::Array prepareNativeMessageTypesArray(jsi::Runtime &rt);

public:
  CommConstants();
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override;
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;
};
} // namespace comm

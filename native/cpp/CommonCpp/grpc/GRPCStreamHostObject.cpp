#include "GRPCStreamHostObject.h"
#import <jsi/jsi.h>

using namespace facebook;

GRPCStreamHostObject::GRPCStreamHostObject()
    : readyState{0}, onopen{}, onmessage{}, onclose{} {
}

std::vector<jsi::PropNameID>
GRPCStreamHostObject::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> names;
  names.reserve(6);
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"readyState"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"onopen"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"onmessage"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"onclose"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"close"}));
  names.push_back(jsi::PropNameID::forUtf8(rt, std::string{"send"}));
  return names;
}

jsi::Value
GRPCStreamHostObject::get(jsi::Runtime &runtime, const jsi::PropNameID &name) {
  auto propName = name.utf8(runtime);

  if (propName == "readyState") {
    return jsi::Value(this->readyState);
  }

  return jsi::String::createFromUtf8(runtime, std::string{"unimplemented"});
}

void GRPCStreamHostObject::set(
    jsi::Runtime &runtime,
    const jsi::PropNameID &name,
    const jsi::Value &value) {
  auto propName = name.utf8(runtime);

  if (propName == "readyState" && value.isNumber()) {
    this->readyState = static_cast<int>(value.asNumber());
  } else if (
      propName == "onopen" && value.isObject() &&
      value.asObject(runtime).isFunction(runtime)) {
    this->onopen = value.asObject(runtime).asFunction(runtime);
  } else if (
      propName == "onmessage" && value.isObject() &&
      value.asObject(runtime).isFunction(runtime)) {
    this->onmessage = value.asObject(runtime).asFunction(runtime);
  } else if (
      propName == "onclose" && value.isObject() &&
      value.asObject(runtime).isFunction(runtime)) {
    this->onclose = value.asObject(runtime).asFunction(runtime);
  }
}

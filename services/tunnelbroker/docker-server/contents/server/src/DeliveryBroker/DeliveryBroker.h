#pragma once

#include "Constants.h"
#include "DeliveryBrokerEntites.h"
#include <string.h>
#include <vector>

void DeliveryBrokerPush(
    std::string toDeviceID,
    std::string fromDeviceID,
    std::string payload);
std::vector<DeliveryBrokerMessageStruct>
DeliveryBrokerGet(std::string deviceID);
void DeliveryBrokerClear(std::string key);
void DeliveryBrokerClear();

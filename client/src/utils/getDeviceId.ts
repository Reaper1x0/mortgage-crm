const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    deviceId = `${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("device_id", deviceId);
  }

  return deviceId;
};

export default getDeviceId;

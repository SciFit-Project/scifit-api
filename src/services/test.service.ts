export const getHealthStatus = () => {
  return {
    status: "OK",
    timestamp: new Date().toISOString(),
  };
};

const messageEvents = require("./messageEvents");
const notificationEvents = require("./notificationEvents");

// 이벤트 에러 처리
messageEvents.on("error", (error) => {
  console.error("Message event error:", error);
});

notificationEvents.on("error", (error) => {
  console.error("Notification event error:", error);
});

module.exports = {
  messageEvents,
  notificationEvents,
};

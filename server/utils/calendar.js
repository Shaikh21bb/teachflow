function getTodayDow(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: process.env.APP_TIMEZONE || "Asia/Almaty",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}
module.exports = { getTodayDow };

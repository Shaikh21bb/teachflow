const teacherRoutes =
  /^\/(dashboard|builder|my-lessons|classes|assignments|quizzes|games|quests|reports|schedule|alfarabi-bot|templates|library|open-lessons|marketplace|profile|settings|pricing|chat|leaderboard|admin|integrations|telegram|lesson)(\/|$)/;
export function teacherReturnPath(value) {
  if (
    typeof value !== "string" ||
    value.length > 1000 ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/dashboard";
  try {
    const parsed = new URL(value, "https://urpaq.invalid");
    if (
      parsed.origin !== "https://urpaq.invalid" ||
      !teacherRoutes.test(parsed.pathname)
    )
      return "/dashboard";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/dashboard";
  }
}

// Enable only for the joint release of admin-learning-content tickets 02 and 03.
export function isAdminLearningEnabled(): boolean {
  return import.meta.env.VITE_ADMIN_LEARNING_ENABLED === "true";
}

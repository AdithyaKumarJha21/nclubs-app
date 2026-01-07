import { useState } from "react";

export function useEditMode() {
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = () => setIsEditing(true);
  const cancelEdit = () => setIsEditing(false);
  const saveEdit = () => setIsEditing(false); // backend later

  return {
    isEditing,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}

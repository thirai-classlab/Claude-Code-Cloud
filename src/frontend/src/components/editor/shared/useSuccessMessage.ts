/**
 * Success Message Hook
 *
 * A reusable hook for showing temporary success messages.
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing success message state with auto-dismiss
 * @param timeout - Duration in milliseconds before the message is dismissed (default: 3000)
 * @returns [successMessage, showSuccess, clearSuccess]
 */
export const useSuccessMessage = (timeout: number = 3000) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), timeout);
  }, [timeout]);

  const clearSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return [successMessage, showSuccess, clearSuccess] as const;
};

export default useSuccessMessage;

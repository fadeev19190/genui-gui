import React from 'react';
import { Alert } from 'reactstrap';

/**
 * Custom error display for GeneratedMolSet task errors
 * Extracts user-friendly messages from ValueError tracebacks
 */
function GeneratedSetErrorDisplay(props) {
  const error = props.error;

  // Try to extract the ValueError message from the traceback
  let errorMessage = null;

  if (error.messages && error.messages.current) {
    // Get the current error messages
    const messages = error.messages.current;

    // Look for ValueError message in the traceback
    messages.forEach(msg => {
      // Match patterns like: "ValueError: No molecules found..."
      const match = msg.match(/ValueError:\s*(.+?)(?:\n|$)/);
      if (match) {
        errorMessage = match[1].trim();
      }
    });
  }

  // If we found a clean error message, display it nicely
  if (errorMessage) {
    // Check if it's a score threshold error
    const isScoreError = errorMessage.includes('score') &&
                        (errorMessage.includes('No molecules found') ||
                         errorMessage.includes('Available score range'));

    return (
      <Alert color={isScoreError ? "warning" : "danger"} className="mb-0">
        <strong>{isScoreError ? '⚠️ Score Threshold Too High' : 'Error'}:</strong>
        <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
          {errorMessage}
        </div>
        {isScoreError && (
          <div className="mt-2">
            <small>
              <strong>Tip:</strong> Try creating a new set with a lower minimum score threshold,
              or leave the threshold empty to include all molecules.
            </small>
          </div>
        )}
      </Alert>
    );
  }

  // Fallback to default display
  return (
    <div>
      {error.messages.current.map((message, idx) => (
        <span key={idx}>{message}</span>
      ))}
    </div>
  );
}

export default GeneratedSetErrorDisplay;

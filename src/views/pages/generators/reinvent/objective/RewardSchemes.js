import React from "react";
import { Alert } from 'reactstrap';

/**
 * DEPRECATED: RewardSchemes component
 *
 * Reward Schemes (aggregation types) are no longer created separately.
 * They are now integrated directly into:
 * - ReinventEnvironment (aggregation_type field)
 * - ReinventStage (aggregation_type field)
 *
 * Available options:
 * - geometric_mean: Geometric Mean (Balanced - all scores must be good)
 * - arithmetic_mean: Arithmetic Mean (Flexible - based on weights)
 */

export default function RewardSchemes(props) {
  return (
    <Alert color="info">
      <h5>ℹ️ Reward Schemes Deprecated</h5>
      <p style={{ marginBottom: 0 }}>
        Reward schemes are now integrated directly into <strong>Environments</strong> and <strong>Stages</strong>.
        When creating or editing an Environment or Stage, you'll see the <strong>Aggregation Type</strong> field
        where you can choose between:
      </p>
      <ul style={{ marginTop: "0.5rem", marginBottom: 0 }}>
        <li><strong>Geometric Mean (Balanced):</strong> All scores must be good. One bad score makes overall score bad.</li>
        <li><strong>Arithmetic Mean (Flexible):</strong> Scores are combined based on weights.</li>
      </ul>
    </Alert>
  );
}

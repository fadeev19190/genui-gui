import React from 'react';
import { Table, Badge } from 'reactstrap';
import './generated-molecules-styles.css';

/**
 * GeneratedMoleculesTable - Display molecules from REINVENT runs with their scores
 *
 * Props:
 *  - molecules: Array of molecule objects with activities
 *  - maxRows: Maximum number of molecules to display (default: 50)
 */
export function GeneratedMoleculesTable(props) {
  const molecules = props.molecules || [];
  const maxRows = props.maxRows || 50;
  const displayMolecules = molecules.slice(0, maxRows);

  // Extract REINVENT scores from molecules
  const moleculesWithScores = displayMolecules.map(mol => {
    let score = null;
    let scoreColor = 'secondary';

    if (mol.activities && Array.isArray(mol.activities)) {
      const scoreActivity = mol.activities.find(act =>
        act.type && (act.type.value === 'REINVENT_Score' || act.type === 'REINVENT_Score')
      );
      if (scoreActivity) {
        score = scoreActivity.value;
        // Color code the score: red (low) to green (high)
        if (score >= 0.8) scoreColor = 'success';
        else if (score >= 0.6) scoreColor = 'info';
        else if (score >= 0.4) scoreColor = 'warning';
        else scoreColor = 'danger';
      }
    }

    return { ...mol, score, scoreColor };
  });

  if (displayMolecules.length === 0) {
    return (
      <div className="reinvent-molecules-empty">
        <p>No molecules available</p>
      </div>
    );
  }

  return (
    <div className="reinvent-molecules-table">
      <div className="reinvent-molecules-info">
        <p>Showing {displayMolecules.length} of {molecules.length} molecules</p>
      </div>
      <Table striped hover responsive size="sm">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>ID</th>
            <th style={{ width: '70%' }}>SMILES</th>
            <th style={{ width: '15%' }}>REINVENT Score</th>
            <th style={{ width: '10%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {moleculesWithScores.map((mol, idx) => (
            <tr key={mol.id || idx}>
              <td><small>{mol.id}</small></td>
              <td>
                <code className="reinvent-smiles">{mol.smiles}</code>
              </td>
              <td>
                {mol.score !== null ? (
                  <Badge color={mol.scoreColor} pill>
                    {(mol.score).toFixed(4)}
                  </Badge>
                ) : (
                  <Badge color="secondary" pill>N/A</Badge>
                )}
              </td>
              <td>
                <a
                  href={`#/compounds/view/${mol.id}`}
                  className="btn btn-sm btn-outline-primary"
                  title="View molecule details"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

/**
 * GeneratedMoleculesGrid - Display molecules in a grid with score cards
 */
export function GeneratedMoleculesGrid(props) {
  const molecules = props.molecules || [];
  const maxRows = props.maxRows || 20;
  const displayMolecules = molecules.slice(0, maxRows);

  if (displayMolecules.length === 0) {
    return (
      <div className="reinvent-molecules-empty">
        <p>No molecules available</p>
      </div>
    );
  }

  return (
    <div className="reinvent-molecules-grid">
      <div className="reinvent-molecules-info">
        <p>Showing {displayMolecules.length} of {molecules.length} molecules</p>
      </div>
      <div className="molecules-grid-container">
        {displayMolecules.map((mol, idx) => {
          let score = null;
          let scoreColor = 'secondary';

          if (mol.activities && Array.isArray(mol.activities)) {
            const scoreActivity = mol.activities.find(act =>
              act.type && (act.type.value === 'REINVENT_Score' || act.type === 'REINVENT_Score')
            );
            if (scoreActivity) {
              score = scoreActivity.value;
              if (score >= 0.8) scoreColor = 'success';
              else if (score >= 0.6) scoreColor = 'info';
              else if (score >= 0.4) scoreColor = 'warning';
              else scoreColor = 'danger';
            }
          }

          return (
            <div key={mol.id || idx} className="molecule-card">
              <div className="molecule-card-header">
                <strong>Mol #{mol.id}</strong>
                {score !== null && (
                  <Badge color={scoreColor} pill className="molecule-score-badge">
                    {(score).toFixed(4)}
                  </Badge>
                )}
              </div>
              <div className="molecule-card-body">
                <code className="molecule-smiles">{mol.smiles}</code>
              </div>
              <div className="molecule-card-footer">
                <a
                  href={`#/compounds/view/${mol.id}`}
                  className="btn btn-sm btn-outline-primary"
                >
                  Details
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GeneratedMoleculesTable;

import React from "react";
import { ReinventNetCard } from './ModelCards';
import { ReinventNetCreateCard } from './ModelCreateCards';
import { ModelsPage } from '../../../../genui';

class ReinventPage extends React.Component {

  render() {
    const algorithmChoices = this.props.algorithmChoices || [];
    const reinventNetAlgo = algorithmChoices.find(algorithm => algorithm && algorithm.name === "ReinventNet");

    if (!reinventNetAlgo) {
      return (
        <div style={{ padding: "2rem", backgroundColor: "#f8f9fa" }}>
          <h2>Reinvent Network Designer</h2>
          <div className="alert alert-warning">
            <h5>⚠️ ReinventNet Algorithm Not Available</h5>
            <p>The ReinventNet algorithm has not been initialized yet. This may occur if:</p>
            <ul>
              <li>The application is still loading algorithms</li>
              <li>The genuireinvent extension has not been properly set up</li>
              <li>Database migrations have not been run</li>
            </ul>
            <p>Please refresh the page or contact your system administrator.</p>
          </div>
        </div>
      );
    }

    const definitionsNet = {
      ReinventNetwork : {
        name: "Reinvent Networks",
        url: new URL(`networks/`, this.props.apiUrls.reinventRoot),
        listComponent: ReinventNetCard,
        newComponents: [{
          label: "New",
          component: ReinventNetCreateCard
        }],
      }
    };

    return (
      <React.Fragment>

        <div style={{
          margin: "1rem 0",
          padding: "0.85rem 1.1rem",
          backgroundColor: "#f0f8ff",
          borderLeft: "4px solid #0066cc",
          borderRadius: "4px",
          fontSize: "0.875rem",
          color: "#334155",
          lineHeight: 1.6,
        }}>
          <strong>🧠 Model Designer</strong> — Train a <em>ReinventNet</em> prior network on your molecule set.
          The prior learns the statistical distribution of drug-like SMILES from your training data.
          Once trained, it is used as the starting point for <strong>Staged Learning</strong>.{" "}
          <span style={{ color: "#6c757d" }}>
            Typical workflow: upload a compound set → create a network → train it here → then proceed to <em>Staged Learning</em>.
          </span>
        </div>

        <ModelsPage
          {...this.props}
          algorithmChoices={[reinventNetAlgo]}
          definitions={definitionsNet}
        />
      </React.Fragment>

    );
  }
}

export default ReinventPage;
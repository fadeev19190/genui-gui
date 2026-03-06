import React from "react";
import Form from "@rjsf/bootstrap-4";
import { ComponentWithObjects, ComponentWithResources } from '../../../../../genui';
import { Button, Card, CardBody, CardHeader, Container, Row, Col, Badge, Alert } from 'reactstrap';
import CardGrid from '../objective/CardGrid';

function AgentTrainingSection(props) {
  return (
    <Card style={{ marginBottom: "2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <CardHeader style={{ backgroundColor: "#007bff", color: "white" }}>
        <h4 style={{ margin: 0 }}>
          <span style={{ marginRight: "0.5rem" }}>①</span>
          Agent Training Configuration
        </h4>
      </CardHeader>
      <CardBody>
        <ComponentWithResources
          {...props}
          definition={{
            networks: new URL(`networks/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
            learningTypes: new URL('agent-training/learning-strategies/', props.apiUrls.reinventRoot),
            algorithms: new URL('algorithms/', props.apiUrls.generatorsRoot)
          }}
        >
          {(isLoaded, data) => isLoaded ? (
            <ComponentWithObjects
              {...props}
              commitObjects={true}
              objectListURL={new URL('agent-training/', props.apiUrls.reinventRoot)}
              emptyClassName="AgentTraining"
              render={(trainData, x, handleAdd, handleDelete, requestUpdate) => {
                const trainings = trainData.AgentTraining || [];

                let algorithmId = null;
                let modeId = null;

                let algorithms = [];
                if (data.algorithms && Array.isArray(data.algorithms)) {
                  algorithms = data.algorithms;
                } else if (data.algorithms?.results) {
                  algorithms = data.algorithms.results;
                } else if (props.algorithmChoices && Array.isArray(props.algorithmChoices)) {
                  algorithms = props.algorithmChoices;
                }

                if (algorithms.length > 0) {
                  const reinventAlgo = algorithms.find(a => a.name === "ReinventNet");
                  if (reinventAlgo) {
                    algorithmId = reinventAlgo.id;
                    const agentMode = reinventAlgo.validModes?.find(m => m.name === "ReinventAgent");
                    if (agentMode) {
                      modeId = agentMode.id;
                    }
                  }
                }

                // Rest of AgentTrainingSection implementation...
                return (
                  <Alert color="info">
                    Agent Training Configuration form would go here
                  </Alert>
                );
              }}
            />
          ) : <div>⏳ Loading...</div>}
        </ComponentWithResources>
      </CardBody>
    </Card>
  );
}

function AgentValidationSection(props) {
  return (
    <Card style={{ marginBottom: "2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <CardHeader style={{ backgroundColor: "#17a2b8", color: "white" }}>
        <h4 style={{ margin: 0 }}>
          <span style={{ marginRight: "0.5rem" }}>②</span>
          Agent Validation Configuration (Optional)
        </h4>
      </CardHeader>
      <CardBody>
        <Alert color="info">
          Agent Validation Configuration form would go here
        </Alert>
      </CardBody>
    </Card>
  );
}

function AgentsSection(props) {
  return (
    <Card style={{ marginBottom: "2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <CardHeader style={{ backgroundColor: "#28a745", color: "white" }}>
        <h4 style={{ margin: 0 }}>
          <span style={{ marginRight: "0.5rem" }}>③</span>
          Agents
        </h4>
      </CardHeader>
      <CardBody>
        <Alert color="info">
          Agents creation form would go here
        </Alert>
      </CardBody>
    </Card>
  );
}

export default function AgentsPage(props) {
  return (
    <Container fluid style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>Agents Configuration</h1>
        <p style={{ color: "#6c757d" }}>
          Configure training, validation, and create agents that combine environments with training settings.
        </p>
      </div>

      <Row>
        <Col xs="12">
          <AgentTrainingSection {...props}/>
          <AgentValidationSection {...props}/>
          <AgentsSection {...props}/>
        </Col>
      </Row>
    </Container>
  );
}

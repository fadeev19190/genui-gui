import React from "react";
import UnifiedScorers from './UnifiedScorers';
import { Card, CardBody, CardHeader, Container, Row, Col, Alert } from 'reactstrap';

export default function ObjectivePage (props) {
  return (
    <Container fluid style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>Scoring Components Library</h1>

        <Alert color="info" style={{ marginBottom: "1rem" }}>
          <h5 style={{ marginTop: 0 }}>📋 How Scoring Components Work</h5>
          <p style={{ marginBottom: "0.5rem" }}>
            Scoring components define <strong>what molecular properties to optimize</strong> during reinforcement learning.
            They are created here as a <em>project-level library</em>, then <strong>assigned to individual Stages</strong> in the
            {' '}<strong>Staged Learning → Multi-Stage Learning</strong> tab.
          </p>
          <div style={{ backgroundColor: "rgba(255,255,255,0.6)", borderRadius: "4px", padding: "0.75rem", marginBottom: "0.5rem" }}>
            <strong>Workflow:</strong>
            <ol style={{ marginBottom: 0, paddingLeft: "1.5rem", marginTop: "0.3rem" }}>
              <li>Create property scorers here</li>
              <li>Go to <strong>Staged Learning → Multi-Stage Learning</strong> and assign scorers to each stage</li>
            </ol>
          </div>
          <p style={{ marginBottom: 0, fontSize: "0.9rem" }}>
            <strong>Why per-Stage?</strong> Different stages of RL training can optimize different objectives —
            e.g. Stage 1 focuses on drug-likeness (QED), Stage 2 adds activity (QSAR model scorer).
          </p>
        </Alert>
      </div>

      <Row>
        <Col xs="12">
          <Card style={{ marginBottom: "2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            <CardHeader style={{ backgroundColor: "#007bff", color: "white" }}>
              <h3 style={{ margin: 0 }}>
                Scoring Components
              </h3>
            </CardHeader>
            <CardBody>
              <UnifiedScorers {...props} triggerDataRefresh={props.triggerDataRefresh}/>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
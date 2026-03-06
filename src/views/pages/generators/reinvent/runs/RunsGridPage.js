import React from "react";
import { RunCard } from './RunCard';
import { Container, Row, Col, Alert, Button } from 'reactstrap';

export default class RunsGridPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      runs: [],
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.fetchRuns();
  }

  componentDidUpdate(prevProps) {
    const prevKey = prevProps.reinventRefreshCounter?.runs || 0;
    const nextKey = this.props.reinventRefreshCounter?.runs || 0;
    if (nextKey !== prevKey) {
      this.fetchRuns();
    }
  }

  fetchRuns = async () => {
    this.setState({ loading: true, error: null });
    try {
      const url = new URL('runs/', this.props.apiUrls.reinventRoot);
      if (this.props.currentProject) {
        url.searchParams.set('project_id', this.props.currentProject.id);
      }
      const resp = await fetch(url, { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json();
        this.setState({ runs: data.results || data || [], loading: false });
      } else {
        this.setState({ error: "Failed to load runs", loading: false });
      }
    } catch (err) {
      this.setState({ error: err.message, loading: false });
    }
  };

  handleDelete = async (run) => {
    if (!window.confirm(`Are you sure you want to delete Run ${run.id}?`)) {
      return;
    }

    try {
      const url = new URL(`runs/${run.id}/`, this.props.apiUrls.reinventRoot);
      const resp = await fetch(url, {
        method: 'DELETE',
        credentials: "include"
      });
      if (resp.ok) {
        this.fetchRuns(); // Refresh the list
      } else {
        alert("Failed to delete run");
      }
    } catch (err) {
      alert("Error deleting run: " + err.message);
    }
  };

  render() {
    const { runs, loading, error } = this.state;

    if (loading) {
      return (
        <Container fluid style={{ padding: "2rem" }}>
          <h2>Loading Runs...</h2>
        </Container>
      );
    }

    if (error) {
      return (
        <Container fluid style={{ padding: "2rem" }}>
          <Alert color="danger">
            <h5>Error Loading Runs</h5>
            <p>{error}</p>
            <Button color="primary" onClick={this.fetchRuns}>Retry</Button>
          </Alert>
        </Container>
      );
    }

    if (runs.length === 0) {
      return (
        <Container fluid style={{ padding: "2rem" }}>
          <Alert color="info">
            <h5>No Runs Available</h5>
            <p>Create your first run in the Runs tab to see it here.</p>
          </Alert>
        </Container>
      );
    }

    return (
      <Container fluid style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h2>Staged Learning Runs</h2>
          <p>View and manage your reinforcement learning runs</p>
        </div>

        <Row>
          {runs.map(run => (
            <Col key={run.id} xs="12" lg="6" xl="4">
              <RunCard
                model={run}
                apiUrls={this.props.apiUrls}
                onDelete={this.handleDelete}
                currentProject={this.props.currentProject}
              />
            </Col>
          ))}
        </Row>

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <Button color="secondary" onClick={this.fetchRuns}>
            🔄 Refresh
          </Button>
        </div>
      </Container>
    );
  }
}

import React from "react";
import { Card, CardBody, CardHeader, Badge, Button, Nav, NavItem, NavLink, Alert } from "reactstrap";

// Parse staged learning log file for metrics
function parseStagedLearningLog(logContent) {
  if (!logContent) return null;

  const lines = logContent.split('\n');
  const info = {
    currentStep: null,
    totalSteps: null,
    bestScore: null,
    latestScore: null,
    bestValidationLoss: null,
    latestValidationLoss: null,
    warnings: [],
    errors: [],
    isFinished: false,
    startTime: null,
    endTime: null,
    peakMemory: null
  };

  lines.forEach(line => {
    // Skip package/library warnings (torch, numpy, etc)
    const packagePrefixes = [
      '/site-packages/',
      'FutureWarning',
      'DeprecationWarning',
      'torch.distributed',
      'torch.cuda',
      'numpy',
      'sklearn',
      'pandas'
    ];

    const isPackageWarning = packagePrefixes.some(prefix => line.includes(prefix));

    // Extract step progress
    const stepMatch = line.match(/Step\s+(\d+)[:/]/i);
    if (stepMatch) {
      info.currentStep = parseInt(stepMatch[1]);
    }

    // Extract score metrics
    const scoreMatch = line.match(/Score:\s*([\d.]+)/i);
    if (scoreMatch) {
      info.latestScore = parseFloat(scoreMatch[1]);
      if (!info.bestScore || parseFloat(scoreMatch[1]) > info.bestScore) {
        info.bestScore = parseFloat(scoreMatch[1]);
      }
    }

    // Extract loss metrics
    const lossMatch = line.match(/Loss:\s*([\d.]+)/i);
    if (lossMatch) {
      info.latestValidationLoss = parseFloat(lossMatch[1]);
      if (!info.bestValidationLoss || parseFloat(lossMatch[1]) < info.bestValidationLoss) {
        info.bestValidationLoss = parseFloat(lossMatch[1]);
      }
    }

    // Extract warnings (but NOT package warnings)
    if (line.toLowerCase().includes('warning') && !isPackageWarning && line.trim().length > 10) {
      info.warnings.push(line);
    }

    // Extract errors (skip package errors)
    if (line.toLowerCase().includes('error') && !isPackageWarning && line.trim().length > 10) {
      info.errors.push(line);
    }

    // Check if finished
    if (line.toLowerCase().includes('completed') || line.toLowerCase().includes('finished')) {
      info.isFinished = true;
    }
  });

  return info;
}

export class RunCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: "Info",
      tasks: [],
      loading: true,
      logContent: null,
      tbData: null,
      logLoading: false,
      generatedMolecules: null,
      starting: false,
      startError: null,
      stageCount: null,    // null = not yet loaded
      stagesLoaded: false,
      stageDetails: [],    // full stage data including property_scorers
      csvScores: null,     // score data from CSV files
    };
  }

  componentDidMount() {
    this.fetchTasks();
    this.fetchLog();
    this.fetchTBData();
    this.fetchGeneratedMolecules();
    this.fetchStageCount();
    this.fetchCsvScores();
    this.taskInterval = setInterval(() => this.fetchTasks(), 3000);
    this.logInterval = setInterval(() => { this.fetchLog(); this.fetchCsvScores(); }, 8000);
  }

  componentWillUnmount() {
    if (this.taskInterval) clearInterval(this.taskInterval);
    if (this.logInterval) clearInterval(this.logInterval);
  }

  stopPolling = () => {
    if (this.taskInterval) { clearInterval(this.taskInterval); this.taskInterval = null; }
    if (this.logInterval) { clearInterval(this.logInterval); this.logInterval = null; }
  };

  startTraining = async () => {
    const run = this.props.model;
    this.setState({ starting: true, startError: null });
    try {
      const baseUrl = this.props.apiUrls?.reinventRoot || '/api/generators/reinvent/';
      const urlStr = typeof baseUrl === 'string' ? baseUrl : baseUrl.toString();
      const finalUrl = urlStr.endsWith('/') ? urlStr : urlStr + '/';
      const url = finalUrl + `runs/${run.id}/run-staged-learning/`;
      const resp = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: "auto" })
      });
      const data = await resp.json();
      if (!resp.ok) {
        this.setState({ startError: data.error || `HTTP ${resp.status}`, starting: false });
        return;
      }
      this.setState({ starting: false });
      this.fetchStageCount();
      // restart polling to pick up new task
      if (!this.taskInterval) {
        this.taskInterval = setInterval(() => this.fetchTasks(), 5000);
      }
      if (!this.logInterval) {
        this.logInterval = setInterval(() => this.fetchLog(), 10000);
      }
      this.fetchTasks();
    } catch (err) {
      this.setState({ startError: err.message, starting: false });
    }
  };

  fetchStageCount = async () => {
    const run = this.props.model;
    try {
      const baseUrl = this.props.apiUrls?.reinventRoot || '/api/generators/reinvent/';
      const urlStr = typeof baseUrl === 'string' ? baseUrl : baseUrl.toString();
      const finalUrl = urlStr.endsWith('/') ? urlStr : urlStr + '/';
      const url = finalUrl + `stages/?generator=${run.id}`;
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) { this.setState({ stagesLoaded: true, stageCount: 0, stageDetails: [] }); return; }
      const data = await resp.json();
      const stages = Array.isArray(data) ? data : (data.results || []);
      this.setState({ stageCount: stages.length, stagesLoaded: true, stageDetails: stages });
    } catch (err) {
      this.setState({ stagesLoaded: true, stageCount: 0, stageDetails: [] });
    }
  };

  fetchTasks = async () => {
    const run = this.props.model;
    try {
      const baseUrl = this.props.apiUrls?.reinventRoot || '/api/generators/reinvent/';
      const urlStr = typeof baseUrl === 'string' ? baseUrl : baseUrl.toString();
      const finalUrl = urlStr.endsWith('/') ? urlStr : urlStr + '/';
      const url = finalUrl + `runs/${run.id}/tasks/all/`;

      const resp = await fetch(url, { credentials: "include" });
      if (resp.status === 404) { this.stopPolling(); return; }
      const data = await resp.json();

      // Normalise: backend returns {results: [...]} but guard against other shapes
      let taskList = [];
      if (Array.isArray(data)) {
        taskList = data;
      } else if (Array.isArray(data?.results)) {
        taskList = data.results;
      } else if (typeof data === 'object' && data !== null) {
        // legacy dict-of-lists shape: {taskName: [{...}, ...]}
        taskList = Object.values(data).flat();
      }

      // Normalise every status to uppercase so comparisons are consistent
      taskList = taskList.map(t => ({
        ...t,
        status: String(t.status || '').toUpperCase(),
      }));

      this.setState({ tasks: taskList, loading: false });

      // Stop polling once ALL tasks are in a terminal state
      const terminalStates = new Set(['SUCCESS', 'FAILURE', 'FAILED', 'REVOKED', 'REJECTED']);
      const allDone = taskList.length > 0 && taskList.every(t => terminalStates.has(t.status));
      if (allDone) this.stopPolling();
    } catch (err) {
      console.error('[RunCard] Error fetching tasks:', err);
      this.setState({ loading: false });
    }
  };

  fetchLog = async () => {
    const run = this.props.model;
    try {
      const baseUrl = this.props.apiUrls?.reinventRoot || '/api/generators/reinvent/';
      const urlStr = typeof baseUrl === 'string' ? baseUrl : baseUrl.toString();
      const finalUrl = urlStr.endsWith('/') ? urlStr : urlStr + '/';
      const url = finalUrl + `runs/${run.id}/training-log/`;

      this.setState({ logLoading: true });
      const resp = await fetch(url, { credentials: "include" });
      if (resp.status === 404) { this.stopPolling(); this.setState({ logLoading: false }); return; }
      const data = await resp.json();
      if (data.content) {
        this.setState({ logContent: data.content, logLoading: false });
      } else {
        this.setState({ logLoading: false });
      }
    } catch (err) {
      console.error('[RunCard] Error fetching log:', err);
      this.setState({ logLoading: false });
    }
  };

  fetchTBData = async () => {
    const run = this.props.model;
    try {
      const baseUrl = this.props.apiUrls?.reinventRoot || '/api/generators/reinvent/';
      const urlStr = typeof baseUrl === 'string' ? baseUrl : baseUrl.toString();
      const finalUrl = urlStr.endsWith('/') ? urlStr : urlStr + '/';
      const url = finalUrl + `runs/${run.id}/training-tb/`;

      const resp = await fetch(url, { credentials: "include" });
      if (resp.status === 404) { this.stopPolling(); return; }
      const data = await resp.json();
      if (data.exists) {
        this.setState({ tbData: data });
      }
    } catch (err) {
      console.error('[RunCard] Error fetching TB data:', err);
    }
  };

  fetchGeneratedMolecules = async () => {
    const run = this.props.model;
    try {
      const baseUrl = this.props.apiUrls?.reinventRoot || '/api/generators/reinvent/';
      const urlStr = typeof baseUrl === 'string' ? baseUrl : baseUrl.toString();
      const finalUrl = urlStr.endsWith('/') ? urlStr : urlStr + '/';
      const url = finalUrl + `runs/${run.id}/generated-molecules/`;

      const resp = await fetch(url, { credentials: "include" });
      if (resp.status === 404) { this.stopPolling(); return; }
      const data = await resp.json();
      if (data.exists) {
        this.setState({ generatedMolecules: data.molset });
      }
    } catch (err) {
      console.error('[RunCard] Error fetching generated molecules:', err);
    }
  };

  fetchCsvScores = async () => {
    const run = this.props.model;
    try {
      const baseUrl = this.props.apiUrls?.reinventRoot || '/api/generators/reinvent/';
      const urlStr = typeof baseUrl === 'string' ? baseUrl : baseUrl.toString();
      const finalUrl = urlStr.endsWith('/') ? urlStr : urlStr + '/';
      const url = finalUrl + `runs/${run.id}/csv-scores/`;

      const resp = await fetch(url, { credentials: "include" });
      if (resp.status === 404) return;
      const data = await resp.json();
      if (data.exists) {
        this.setState({ csvScores: data });
      }
    } catch (err) {
      console.error('[RunCard] Error fetching CSV scores:', err);
    }
  };

  toggleTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const run = this.props.model;
    const { activeTab, tasks, logContent, tbData, generatedMolecules, starting, startError, stageCount, stagesLoaded, csvScores } = this.state;
    const hasStages = stageCount !== null && stageCount > 0;

    // Determine task status — all statuses are already uppercased by fetchTasks
    const runningStates = new Set(['STARTED', 'PROGRESS', 'PENDING', 'RECEIVED', 'RETRY']);
    const completedStates = new Set(['SUCCESS']);
    const failedStates = new Set(['FAILURE', 'FAILED', 'REVOKED', 'REJECTED']);

    let tasksRunning = false;
    let hasCompleted = false;
    let hasFailed = false;
    let failureMessage = null;

    if (tasks && tasks.length > 0) {
      tasksRunning = tasks.some(t => runningStates.has(t.status));

      hasCompleted = tasks.some(t => completedStates.has(t.status));

      const failedTask = tasks.find(t => failedStates.has(t.status));
      if (failedTask) {
        hasFailed = true;
        tasksRunning = false;
        failureMessage = failedTask.traceback || failedTask.result || failedTask.status;
        if (failureMessage) {
          const runtimeMatch = String(failureMessage).match(/RuntimeError\(['"](.+?)['"]\)/s);
          if (runtimeMatch) failureMessage = runtimeMatch[1];
        }
      }
    }

    // If log content exists but tasks array is empty or all PENDING,
    // the worker has accepted the task — treat as running
    if (!hasCompleted && !hasFailed && logContent && !tasksRunning) {
      tasksRunning = true;
    }

    // If tasks exist but are all PENDING (not yet picked up by worker),
    // show as running rather than "Not Started"
    if (!tasksRunning && !hasCompleted && !hasFailed && tasks && tasks.length > 0
        && tasks.every(t => t.status === 'PENDING' || t.status === 'RECEIVED')) {
      tasksRunning = true;
    }

    // Log content means at minimum the run was started once
    if (!hasCompleted && logContent) {
      hasCompleted = true;
    }

    // Parse log info
    const logInfo = logContent ? parseStagedLearningLog(logContent) : null;
    const safeLogInfo = logInfo || {};

    return (
      <Card style={{ marginBottom: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <CardHeader style={{ backgroundColor: hasFailed ? "#f8d7da" : tasksRunning ? "#fff3cd" : "#f8f9fa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h5 style={{ margin: 0 }}>



              🎯 {run.name || `Run ${run.id}`}
            </h5>
            <div>
              {hasFailed && <Badge color="danger">✗ Failed</Badge>}
              {tasksRunning && !hasFailed && <Badge color="info">⏳ Running</Badge>}
              {hasCompleted && !tasksRunning && !hasFailed && <Badge color="success">✓ Completed</Badge>}
              {!tasksRunning && !hasCompleted && !hasFailed && tasks.length > 0 && <Badge color="secondary">⊙ Pending</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {/* Failure banner — always visible when a task has failed */}
          {hasFailed && (
            <Alert color="danger" style={{ marginBottom: "1rem" }}>
              <h6 style={{ marginTop: 0 }}>❌ Task Failed</h6>
              <p style={{ marginBottom: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {failureMessage || "Unknown error. Check the Celery worker logs for details."}
              </p>
            </Alert>
          )}

          {/* Tab Navigation */}
          <Nav tabs style={{ marginBottom: "1rem" }}>
            <NavItem>
              <NavLink
                onClick={() => this.toggleTab("Info")}
                style={{
                  cursor: "pointer",
                  color: activeTab === "Info" ? "#007bff" : "#6c757d",
                  borderBottom: activeTab === "Info" ? "3px solid #007bff" : "none",
                  paddingBottom: "0.5rem"
                }}
              >
                Info
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                onClick={() => this.toggleTab("Performance")}
                style={{
                  cursor: "pointer",
                  color: activeTab === "Performance" ? "#007bff" : "#6c757d",
                  borderBottom: activeTab === "Performance" ? "3px solid #007bff" : "none",
                  paddingBottom: "0.5rem",
                  marginLeft: "1rem"
                }}
              >
                Performance
              </NavLink>
            </NavItem>
          </Nav>

          {/* Info Tab */}
          {activeTab === "Info" && (
            <div>
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td style={{ width: "35%", color: "#6c757d" }}><strong>Name</strong></td>
                    <td>{run.name || <em style={{ color: "#aaa" }}>—</em>}</td>
                  </tr>
                  {run.description && (
                    <tr>
                      <td style={{ color: "#6c757d" }}><strong>Description</strong></td>
                      <td>{run.description}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: "#6c757d" }}><strong>Agent</strong></td>
                    <td>
                      {run.agent_name
                        || (run.agent && typeof run.agent === 'object' ? run.agent.name : null)
                        || (run.agent ? `Agent ${run.agent}` : '—')}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "#6c757d" }}><strong>Environment</strong></td>
                    <td>
                      {run.environment_name
                        || (run.environment && typeof run.environment === 'object' ? run.environment.name : null)
                        || (run.environment ? `Environment ${run.environment}` : '—')}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "#6c757d" }}><strong>Created</strong></td>
                    <td>
                      {(run.created || run.created_at)
                        ? new Date(run.created || run.created_at).toLocaleString()
                        : <em style={{ color: "#aaa" }}>—</em>}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Scoring Components per Stage */}
              {this.state.stageDetails && this.state.stageDetails.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h6 style={{ marginBottom: "0.75rem", borderBottom: "1px solid #dee2e6", paddingBottom: "0.5rem" }}>
                    🧪 Scoring Components ({this.state.stageDetails.length} stage{this.state.stageDetails.length !== 1 ? 's' : ''})
                  </h6>
                  {this.state.stageDetails.map((stage, idx) => {
                    const scorerIds = stage.property_scorers || [];
                    // Resolve scorer names from the scorers list passed via props
                    const allScorers = this.props.propertyScorers || [];
                    const stageScorers = scorerIds.map(sid => {
                      const found = allScorers.find(s => s.id === sid);
                      return found ? `${found.property_name} (w=${found.weight})` : `Scorer #${sid}`;
                    });
                    return (
                      <div key={stage.id || idx} style={{
                        padding: "0.5rem 0.75rem", marginBottom: "0.5rem",
                        background: "#f1f3f5", borderRadius: "4px", fontSize: "0.85rem"
                      }}>
                        <strong>Stage {idx + 1}</strong>
                        <span style={{ color: "#6c757d", marginLeft: "0.5rem" }}>
                          (max {stage.max_steps} steps)
                        </span>
                        {stageScorers.length > 0 ? (
                          <div style={{ marginTop: "0.25rem" }}>
                            {stageScorers.map((s, i) => (
                              <Badge key={i} color="info" style={{ marginRight: "0.4rem", marginBottom: "0.2rem", fontSize: "0.8rem" }}>{s}</Badge>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: "#aaa", fontStyle: "italic", marginTop: "0.25rem" }}>No scorers assigned</div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "0.5rem" }}>
                    🛡️ Bad SMARTS penalty is automatically included
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === "Performance" && (
            <div>
              {/* Task Status Section */}
              <div style={{ padding: "1rem", backgroundColor: hasFailed ? "#f8d7da" : tasksRunning ? "#fff3cd" : hasCompleted ? "#d4edda" : "#f1f3f5", borderRadius: "4px", marginBottom: "1rem" }}>
                <h6 style={{ marginTop: 0 }}>📊 Task Status</h6>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                  <div>
                    <strong>Overall Status:</strong>
                    <div style={{ fontSize: "1.1rem", marginTop: "0.3rem", fontWeight: "600" }}>
                      {hasFailed ? "🔴 Failed" : tasksRunning ? "🟡 Running" : hasCompleted ? "🟢 Completed" : "⚪ Not Started"}
                    </div>
                  </div>
                  {tasks.length > 0 && (
                    <div>
                      <strong>Task Details:</strong>
                      <div style={{ fontSize: "0.9rem", marginTop: "0.3rem" }}>
                        {tasks.map((t, i) => {
                          const taskStatus = String(t.status || '').toUpperCase();
                          let statusColor = '#6c757d';
                          if (taskStatus === 'SUCCESS') statusColor = '#28a745';
                          else if (taskStatus === 'FAILURE' || taskStatus === 'FAILED') statusColor = '#dc3545';
                          else if (taskStatus.includes('STARTED') || taskStatus.includes('PROGRESS')) statusColor = '#007bff';
                          else if (taskStatus.includes('PENDING') || taskStatus.includes('RECEIVED')) statusColor = '#ffc107';

                          return (
                            <div key={i} style={{ color: statusColor, fontWeight: "500" }}>
                              {t.name || `Task ${i + 1}`}: {t.status}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Log Metrics Section — replaced by CSV-based metrics */}
              {csvScores && csvScores.exists && (
                <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px", marginBottom: "1rem" }}>
                  <h6 style={{ marginTop: 0 }}>📈 Score Metrics (from CSV)</h6>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", fontSize: "0.9rem" }}>
                    <div>
                      <strong>Total Molecules:</strong>
                      <div style={{ fontSize: "1.2rem", color: "#007bff", marginTop: "0.3rem" }}>
                        {csvScores.total_molecules}
                      </div>
                    </div>
                    {csvScores.latest_stage_best !== null && csvScores.latest_stage_best !== undefined && (
                      <div>
                        <strong>Best Score (last stage):</strong>
                        <div style={{ fontSize: "1.2rem", color: "#17a2b8", marginTop: "0.3rem" }}>
                          {Number(csvScores.latest_stage_best).toFixed(4)}
                        </div>
                      </div>
                    )}
                    {csvScores.latest_stage_mean !== null && csvScores.latest_stage_mean !== undefined && (
                      <div>
                        <strong>Mean Score (last stage):</strong>
                        <div style={{ fontSize: "1.2rem", color: "#28a745", marginTop: "0.3rem" }}>
                          {Number(csvScores.latest_stage_mean).toFixed(4)}
                        </div>
                      </div>
                    )}
                    {csvScores.overall_median !== null && csvScores.overall_median !== undefined && (
                      <div>
                        <strong>Median Score (overall):</strong>
                        <div style={{ fontSize: "1.2rem", color: "#6f42c1", marginTop: "0.3rem" }}>
                          {Number(csvScores.overall_median).toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Per-stage breakdown */}
                  {csvScores.stages && csvScores.stages.length > 1 && (
                    <div style={{ marginTop: "1rem" }}>
                      <strong style={{ fontSize: "0.85rem" }}>Per-stage breakdown:</strong>
                      <table className="table table-sm" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                        <thead>
                          <tr>
                            <th>Stage</th>
                            <th>Molecules</th>
                            <th>Mean</th>
                            <th>Best</th>
                            <th>Median</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvScores.stages.map((st, i) => (
                            <tr key={i}>
                              <td>{st.stage}</td>
                              <td>{st.count}</td>
                              <td>{Number(st.mean).toFixed(4)}</td>
                              <td style={{ color: "#17a2b8", fontWeight: "600" }}>{Number(st.best).toFixed(4)}</td>
                              <td>{Number(st.median).toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Score Histogram — last stage only */}
              {csvScores && csvScores.exists && csvScores.histogram && (
                <div style={{ padding: "1rem", backgroundColor: "#e7f3ff", borderRadius: "4px", marginBottom: "1rem" }}>
                  <h6 style={{ marginTop: 0 }}>
                    📊 Score Distribution
                    {csvScores.histogram.stage != null && (
                      <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "#6c757d", marginLeft: "0.5rem" }}>
                        (last stage — stage {csvScores.histogram.stage})
                      </span>
                    )}
                  </h6>
                  {(() => {
                    const { bins, edges } = csvScores.histogram;
                    const maxCount = Math.max(...bins, 1);

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {bins.map((count, i) => {
                          const widthPct = (count / maxCount) * 100;
                          const scoreLabel = `${edges[i].toFixed(2)}–${edges[i + 1].toFixed(2)}`;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", height: "18px" }}>
                              {/* Y-axis score label */}
                              <div style={{
                                minWidth: "72px",
                                textAlign: "right",
                                fontSize: "0.7rem",
                                color: "#495057",
                                fontWeight: "500",
                                flexShrink: 0,
                              }}>
                                {scoreLabel}
                              </div>
                              {/* Bar */}
                              <div style={{ flex: 1, height: "14px", backgroundColor: "#e9ecef", borderRadius: "2px", position: "relative" }}>
                                <div style={{
                                  height: "100%",
                                  width: `${widthPct}%`,
                                  backgroundColor: "#0066cc",
                                  borderRadius: "2px",
                                  opacity: 0.85,
                                  minWidth: count > 0 ? "2px" : "0",
                                }} />
                              </div>
                              {/* Count label */}
                              <div style={{
                                minWidth: "36px",
                                fontSize: "0.7rem",
                                color: "#6c757d",
                                flexShrink: 0,
                              }}>
                                {count}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TensorBoard Metrics Section */}
              {tbData && tbData.exists && (
                <div style={{ padding: "1rem", backgroundColor: "#e7f3ff", borderRadius: "4px", marginBottom: "1rem" }}>
                  <h6 style={{ marginTop: 0 }}>🎯 TensorBoard Metrics</h6>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", fontSize: "0.9rem" }}>
                    {tbData.agent_nll?.latest && (
                      <div>
                        <strong>Agent NLL:</strong>
                        <div style={{ marginTop: "0.3rem" }}>
                          <div>Latest: {Number(tbData.agent_nll.latest.value).toFixed(3)}</div>
                          {tbData.agent_nll.best && (
                            <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                              Best: {Number(tbData.agent_nll.best.value).toFixed(3)} @ step {tbData.agent_nll.best.step}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {tbData.prior_nll?.latest && (
                      <div>
                        <strong>Prior NLL:</strong>
                        <div style={{ marginTop: "0.3rem" }}>
                          <div>Latest: {Number(tbData.prior_nll.latest.value).toFixed(3)}</div>
                          {tbData.prior_nll.best && (
                            <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                              Best: {Number(tbData.prior_nll.best.value).toFixed(3)} @ step {tbData.prior_nll.best.step}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {tbData.score?.latest && (
                      <div>
                        <strong>Score:</strong>
                        <div style={{ marginTop: "0.3rem" }}>
                          <div>Latest: {Number(tbData.score.latest.value).toFixed(3)}</div>
                          {tbData.score.best && (
                            <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                              Best: {Number(tbData.score.best.value).toFixed(3)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generated Molecules Section */}
              {generatedMolecules && (
                <div style={{ padding: "1rem", backgroundColor: "#d4edda", borderRadius: "4px", marginBottom: "1rem" }}>
                  <h6 style={{ marginTop: 0 }}>🧪 Generated Molecules</h6>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.9rem" }}>
                    <div>
                      <strong>Molecule Set:</strong>
                      <div style={{ marginTop: "0.3rem", fontSize: "1rem", fontWeight: "500" }}>
                        {generatedMolecules.name}
                      </div>
                    </div>
                    <div>
                      <strong>Total Molecules:</strong>
                      <div style={{ marginTop: "0.3rem", fontSize: "1.2rem", color: "#28a745", fontWeight: "600" }}>
                        {generatedMolecules.moleculeCount || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings Section - only show if there are actual warnings */}
              {safeLogInfo.warnings && safeLogInfo.warnings.length > 0 && (
                <Alert color="warning" style={{ marginTop: "1rem" }}>
                  <strong>⚠️ Warnings ({safeLogInfo.warnings.length}):</strong>
                  <ul style={{ marginBottom: 0, marginTop: "0.5rem" }}>
                    {safeLogInfo.warnings.slice(0, 5).map((warn, idx) => (
                      <li key={idx} style={{ fontSize: "0.9rem" }}>{warn.substring(0, 100)}</li>
                    ))}
                  </ul>
                  {safeLogInfo.warnings.length > 5 && (
                    <small style={{ color: "#856404" }}>... and {safeLogInfo.warnings.length - 5} more</small>
                  )}
                </Alert>
              )}

              {/* Errors Section - only show if there are actual errors */}
              {safeLogInfo.errors && safeLogInfo.errors.length > 0 && (
                <Alert color="danger" style={{ marginTop: "1rem" }}>
                  <strong>❌ Errors ({safeLogInfo.errors.length}):</strong>
                  <ul style={{ marginBottom: 0, marginTop: "0.5rem" }}>
                    {safeLogInfo.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx} style={{ fontSize: "0.9rem" }}>{err.substring(0, 100)}</li>
                    ))}
                  </ul>
                  {safeLogInfo.errors.length > 5 && (
                    <small style={{ color: "#721c24" }}>... and {safeLogInfo.errors.length - 5} more</small>
                  )}
                </Alert>
              )}

              {/* No Data Message */}
              {!logContent && !tbData && !csvScores && (
                <Alert color="info">
                  Performance metrics will be available once the run starts and generates data.
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: "1rem" }}>
            {startError && (
              <Alert color="danger" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                <strong>❌ Failed to start:</strong> {startError}
              </Alert>
            )}

            {/* No-stages warning — replaces Start button when stages not set up */}
            {stagesLoaded && !hasStages && !tasksRunning && !hasCompleted && (
              <Alert color="warning" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                ⚠️ <strong>No stages defined.</strong> Go to the <strong>Multi-Stage Learning</strong> tab,
                select this run, assign scoring components, and create at least one stage — then come back to start training.
              </Alert>
            )}

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {/* Stage count badge */}
              {stagesLoaded && hasStages && (
                <Badge color="secondary" style={{ fontSize: "0.8rem", padding: "0.35em 0.6em" }}>
                  {stageCount} stage{stageCount !== 1 ? 's' : ''}
                </Badge>
              )}

              {/* Start button — only shown when stages exist and run hasn't started/completed */}
              {!tasksRunning && !hasCompleted && hasStages && (
                <Button color="success" size="sm" disabled={starting} onClick={this.startTraining}>
                  {starting ? "⏳ Starting..." : "▶ Start Training"}
                </Button>
              )}

              {/* Retry button after failure */}
              {hasFailed && hasStages && (
                <Button color="warning" size="sm" disabled={starting} onClick={this.startTraining}>
                  {starting ? "⏳ Starting..." : "🔄 Retry"}
                </Button>
              )}

              <Button color="danger" size="sm" onClick={() => this.props.onDelete && this.props.onDelete(run)}>
                🗑️ Delete
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }
}

export default RunCard;



import React from "react";
import Form from "@rjsf/bootstrap-4";
import { ComponentWithObjects, ComponentWithResources, TabWidget } from '../../../../../genui';
import { Button, Card, CardBody, CardHeader, Container, Row, Col, Badge, Alert } from 'reactstrap';
import CardGrid from '../objective/CardGrid';
import RunsGridPage from './RunsGridPage';


// =====================================================================
// STEP 1: AGENT TRAINING CONFIGURATION
// =====================================================================
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

                // Try to get algorithms from multiple sources, but provide safe defaults
                let algorithmId = null;
                let modeId = null;

                // Try from ComponentWithResources data
                let algorithms = [];
                if (data.algorithms && Array.isArray(data.algorithms)) {
                  algorithms = data.algorithms;
                } else if (data.algorithms?.results) {
                  algorithms = data.algorithms.results;
                } else if (props.algorithmChoices && Array.isArray(props.algorithmChoices)) {
                  algorithms = props.algorithmChoices;
                }

                // If we found algorithms, try to extract IDs
                if (algorithms.length > 0) {
                  console.log("Found algorithms:", algorithms);
                  const reinventAlgo = algorithms.find(a => a.name === "ReinventNet");
                  if (reinventAlgo) {
                    algorithmId = reinventAlgo.id;
                    const agentMode = reinventAlgo.validModes?.find(m => m.name === "ReinventAgent");
                    if (agentMode) {
                      modeId = agentMode.id;
                    }
                    console.log("Extracted algorithm ID:", algorithmId, "Mode ID:", modeId);
                  }
                } else {
                  console.warn("No algorithms found, will attempt to use hardcoded defaults if available");
                }

                return (
                  <React.Fragment>
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h5>Create Training Configuration
                        {trainings.length > 0 && (
                          <Badge color="primary" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                            {trainings.length} config{trainings.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h5>
                      <p style={{ color: "#6c757d" }}>
                        Define how the RL agent will be trained
                      </p>
                    </div>

                    {/* Form */}
                    <AgentTrainingForm
                      networks={data.networks || []}
                      learningTypes={data.learningTypes?.learning_types || []}
                      algorithmId={algorithmId}
                      modeId={modeId}
                      title="AgentTraining"
                      onAdd={handleAdd}
                      requestUpdate={requestUpdate}
                    />

                    {/* List */}
                    {trainings.length > 0 && (
                      <React.Fragment>
                        <hr style={{ margin: "2rem 0" }}/>
                        <h6>📋 Your Training Configurations</h6>
                        <AgentTrainingList data={trainings} title="AgentTraining" onDelete={handleDelete}/>
                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              }}
            />
          ) : <div>⏳ Loading...</div>}
        </ComponentWithResources>
      </CardBody>
    </Card>
  );
}

function AgentTrainingForm(props) {
  const networks = props.networks || [];
  const [algorithmId, setAlgorithmId] = React.useState(props.algorithmId);
  const [modeId, setModeId] = React.useState(props.modeId);
  const [fetchError, setFetchError] = React.useState(null);

  // Try to fetch algorithm/mode if not provided
  React.useEffect(() => {
    if (!algorithmId || !modeId) {
      console.log("Attempting to fetch algorithm and mode...");
      fetch('/api/generators/algorithms/')
        .then(r => r.json())
        .then(data => {
          console.log("Raw algorithms response:", data);

          // Handle paginated response { results: [...] }
          let algos = [];
          if (data.results && Array.isArray(data.results)) {
            algos = data.results;
          } else if (Array.isArray(data)) {
            algos = data;
          }

          console.log("Extracted algos:", algos);

          // Find ReinventNet algorithm
          const reinventAlgo = algos.find(a => a.name === "ReinventNet");
          console.log("ReinventNet algo:", reinventAlgo);

          if (reinventAlgo) {
            setAlgorithmId(reinventAlgo.id);
            console.log("Set algorithmId to:", reinventAlgo.id);

            // Find ReinventAgent mode in validModes
            if (reinventAlgo.validModes && Array.isArray(reinventAlgo.validModes)) {
              const agentMode = reinventAlgo.validModes.find(m => m.name === "ReinventAgent");
              console.log("ReinventAgent mode:", agentMode);
              if (agentMode) {
                setModeId(agentMode.id);
                console.log("Set modeId to:", agentMode.id);
              } else {
                console.warn("ReinventAgent mode not found in validModes:", reinventAlgo.validModes);
              }
            } else {
              console.warn("validModes not found or not an array:", reinventAlgo.validModes);
            }
          } else {
            setFetchError("ReinventNet algorithm not found");
          }
        })
        .catch(err => {
          console.error("Failed to fetch algorithms:", err);
          setFetchError(err.message);
        });
    }
  }, [algorithmId, modeId]);

  if (networks.length === 0) {
    return (
      <Alert color="warning">
        <h6>⚠️ No ReinventNet Models Available</h6>
        <p className="mb-0">Train a ReinventNet model first in the Model Designer tab.</p>
      </Alert>
    );
  }

  if (fetchError && !algorithmId && !modeId) {
    return (
      <Alert color="danger">
        <h6>❌ Configuration Error</h6>
        <p className="mb-0">{fetchError}</p>
      </Alert>
    );
  }

  const schema = {
    type: "object",
    required: ["modelInstance"],
    properties: {
      modelInstance: {
        type: "integer",
        title: "ReinventNet Model (Required)",
        enum: networks.map(item => item.id),
        enumNames: networks.map(item => item.name || `ID ${item.id}`)
      },
      batch_size: {type: "integer", title: "Batch Size", default: 64},
      rate: {type: "number", title: "Learning Rate", default: 0.0001},
      sigma: {type: "number", title: "Sigma", default: 128.0}
    }
  };

  return (
    <Form
      showErrorList={false}
      schema={schema}
      uiSchema={{ modelInstance: {"ui:widget": "select"} }}
      onError={errors => console.error("Training form errors:", errors)}
      onSubmit={(data) => {
        const payload = {
          algorithm: algorithmId || 1,
          mode: modeId || 1,
          modelInstance: Number(data.formData.modelInstance),
          batch_size: Number(data.formData.batch_size || 64),
          rate: Number(data.formData.rate || 0.0001),
          sigma: Number(data.formData.sigma || 128.0),
          learning_type: "dap",
          unique_sequences: true,
          randomize_smiles: true,
          tb_isim: false,
          use_checkpoint: false,
          purge_memories: false,
          summary_csv_prefix: "reinvent"
        };
        console.log("AgentTraining payload:", payload);
        const result = props.onAdd(props.title, payload);

        // Request update to refresh the list
        if (props.requestUpdate) {
          setTimeout(() => {
            props.requestUpdate();
          }, 300);
        }

        return result;
      }}
    >
      <Button type="submit" color="primary" size="lg" style={{ fontWeight: "600" }}>
        ➕ Create Training Config
      </Button>
    </Form>
  );
}

function AgentTrainingList(props) {
  const trainings = props.data || [];
  return (
    <CardGrid
      data={trainings}
      itemDataComponent={({item}) => (
        <React.Fragment>
          <Badge color="primary">ID: {item.id}</Badge>
          <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            <em>Model:</em> {item.modelInstance}<br/>
            <em>Batch Size:</em> {item.batch_size}<br/>
            <em>Learning:</em> {item.learning_type}<br/>
            <em>Rate:</em> {item.rate}
          </div>
        </React.Fragment>
      )}
      onDelete={(item) => props.onDelete(props.title, item)}
    />
  );
}

// =====================================================================
// STEP 2: AGENT VALIDATION (OPTIONAL)
// =====================================================================
function AgentValidationSection(props) {
  return (
    <Card style={{ marginBottom: "2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <CardHeader style={{ backgroundColor: "#17a2b8", color: "white" }}>
        <h4 style={{ margin: 0 }}>
          <span style={{ marginRight: "0.5rem" }}>②</span>
          Agent Validation (Optional)
        </h4>
      </CardHeader>
      <CardBody>
        <ComponentWithResources
          {...props}
          definition={{
            networks: new URL(`networks/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
            modelFiles: new URL(`model-files/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
            metrics: new URL('metrics/', props.apiUrls.reinventRoot)
          }}
        >
          {(isLoaded, data) => isLoaded ? (
            <ComponentWithObjects
              {...props}
              commitObjects={true}
              objectListURL={new URL('agent-validation/', props.apiUrls.reinventRoot)}
              emptyClassName="AgentValidation"
              render={(valData, x, handleAdd, handleDelete, requestUpdate) => {
                const validations = valData.AgentValidation || [];

                return (
                  <React.Fragment>
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h5>Create Validation Configuration
                        {validations.length > 0 && (
                          <Badge color="info" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                            {validations.length} config{validations.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h5>
                      <p style={{ color: "#6c757d" }}>
                        Optional: Track agent performance during training
                      </p>
                    </div>

                    <AgentValidationForm
                      networks={data.networks || []}
                      modelFiles={data.modelFiles || []}
                      metrics={data.metrics || []}
                      title="AgentValidation"
                      onAdd={handleAdd}
                      requestUpdate={requestUpdate}
                    />

                    {validations.length > 0 && (
                      <React.Fragment>
                        <hr style={{ margin: "2rem 0" }}/>
                        <h6>📊 Your Validation Configurations</h6>
                        <AgentValidationList data={validations} title="AgentValidation" onDelete={handleDelete}/>
                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              }}
            />
          ) : <div>⏳ Loading...</div>}
        </ComponentWithResources>
      </CardBody>
    </Card>
  );
}

function AgentValidationForm(props) {
  const networks = props.networks || [];
  const modelFiles = props.modelFiles || [];

  if (networks.length === 0) {
    return <Alert color="warning">No networks available</Alert>;
  }

  const schema = {
    type: "object",
    required: ["modelInstance"],
    properties: {
      modelInstance: {
        type: "integer",
        title: "ReinventNet Model",
        enum: networks.map(item => item.id),
        enumNames: networks.map(item => item.name || `ID ${item.id}`)
      },
      validate_every: {type: "integer", title: "Validate Every N Steps", default: 50},
      ...(modelFiles.length > 0 ? {
        validation_dataset: {
          type: "integer",
          title: "Validation Dataset (Optional)",
          enum: [0, ...modelFiles.map(item => item.id)],
          enumNames: ["None", ...modelFiles.map(item => item.label || `File ${item.id}`)]
        }
      } : {})
    }
  };

  return (
    <Form
      showErrorList={false}
      schema={schema}
      uiSchema={{
        modelInstance: {"ui:widget": "select"},
        ...(modelFiles.length > 0 ? { validation_dataset: {"ui:widget": "select"} } : {})
      }}
      onError={errors => console.error("Validation form errors:", errors)}
      onSubmit={(data) => {
        const payload = {
          modelInstance: Number(data.formData.modelInstance),
          validate_every: Number(data.formData.validate_every || 50),
          validation_dataset: data.formData.validation_dataset ? Number(data.formData.validation_dataset) : null,
          metrics: []
        };
        console.log("AgentValidation payload:", payload);
        const result = props.onAdd(props.title, payload);

        // Request update to refresh the list
        if (props.requestUpdate) {
          setTimeout(() => {
            props.requestUpdate();
          }, 300);
        }

        return result;
      }}
    >
      <Button type="submit" color="info" size="lg" style={{ fontWeight: "600" }}>
        ➕ Create Validation Config
      </Button>
    </Form>
  );
}

function AgentValidationList(props) {
  const validations = props.data || [];
  return (
    <CardGrid
      data={validations}
      itemDataComponent={({item}) => (
        <React.Fragment>
          <Badge color="info">ID: {item.id}</Badge>
          <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            <em>Model:</em> {item.modelInstance}<br/>
            <em>Validate Every:</em> {item.validate_every} steps<br/>
            <em>Dataset:</em> {item.validation_dataset || "None"}
          </div>
        </React.Fragment>
      )}
      onDelete={(item) => props.onDelete(props.title, item)}
    />
  );
}

// =====================================================================
// AGENTS TAB
// =====================================================================
function AgentsSection(props) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <ComponentWithResources
        {...props}
          definition={{
            environments: new URL(`environments/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
            trainings: new URL('agent-training/', props.apiUrls.reinventRoot),
            validations: new URL('agent-validation/', props.apiUrls.reinventRoot)
          }}
        >
          {(isLoaded, data) => isLoaded ? (
            <ComponentWithObjects
              {...props}
              commitObjects={true}
              objectListURL={new URL('agents/', props.apiUrls.reinventRoot)}
              emptyClassName="Agents"
              render={(agentData, x, handleAdd, handleDelete, requestUpdate) => {
                const agents = agentData.Agents || [];
                return (
                  <React.Fragment>
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h5>Create Agent
                        {agents.length > 0 && (
                          <Badge color="success" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                            {agents.length} agent{agents.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h5>
                      <p style={{ color: "#6c757d" }}>
                        Combine environment with training configuration
                      </p>
                    </div>

                    <AgentForm
                      environments={data.environments || []}
                      trainings={data.trainings || []}
                      validations={data.validations || []}
                      title="Agents"
                      onAdd={handleAdd}
                      requestUpdate={requestUpdate}
                    />

                    {agents.length > 0 && (
                      <React.Fragment>
                        <hr style={{ margin: "2rem 0" }}/>
                        <h6>🤖 Your Agents</h6>
                        <AgentList data={agents} title="Agents" onDelete={handleDelete}/>
                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              }}
            />
          ) : <div>⏳ Loading...</div>}
        </ComponentWithResources>
    </div>
  );
}

function AgentForm(props) {
  const environments = props.environments || [];
  const trainings = props.trainings || [];
  const validations = props.validations || [];

  if (environments.length === 0) {
    return <Alert color="warning">No environments available. Create one in Environment Creator.</Alert>;
  }
  if (trainings.length === 0) {
    return <Alert color="warning">No training configs available. Create one above (Agent Training Configuration).</Alert>;
  }

  const schema = {
    type: "object",
    required: ["environment", "training"],
    properties: {
      environment: {
        type: "integer",
        title: "Environment (Required)",
        enum: environments.map(item => item.id),
        enumNames: environments.map(item => item.name || `Environment ${item.id}`)
      },
      training: {
        type: "integer",
        title: "Training Config (Required)",
        enum: trainings.map(item => item.id),
        enumNames: trainings.map(item => `Training ${item.id}`)
      },
      validation: {
        type: "integer",
        title: "Validation Config (Optional)",
        enum: [0, ...validations.map(item => item.id)],
        enumNames: ["None", ...validations.map(item => `Validation ${item.id}`)]
      }
    }
  };

  return (
    <Form
      showErrorList={false}
      schema={schema}
      uiSchema={{
        environment: {"ui:widget": "select"},
        training: {"ui:widget": "select"},
        validation: {"ui:widget": "select"}
      }}
      onError={errors => console.error("Agent form errors:", errors)}
      onSubmit={(data) => {
        const payload = {
          environment: Number(data.formData.environment),
          training: Number(data.formData.training),
          validation: data.formData.validation ? Number(data.formData.validation) : null
        };
        const result = props.onAdd(props.title, payload);

        // Request update to refresh the list
        if (props.requestUpdate) {
          setTimeout(() => {
            props.requestUpdate();
          }, 300);
        }

        return result;
      }}
    >
      <Button type="submit" color="success" size="lg" style={{ fontWeight: "600" }}>
        ➕ Create Agent
      </Button>
    </Form>
  );
}

function AgentList(props) {
  const agents = props.data || [];
  return (
    <CardGrid
      data={agents}
      itemDataComponent={({item}) => (
        <React.Fragment>
          <Badge color="success">ID: {item.id}</Badge>
          <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            <em>Environment:</em> {item.environment}<br/>
            <em>Training:</em> {item.training}<br/>
            <em>Validation:</em> {item.validation || "None"}
          </div>
        </React.Fragment>
      )}
      onDelete={(item) => props.onDelete(props.title, item)}
    />
  );
}

// =====================================================================
// RUNS TAB
// =====================================================================
function RunsSection(props) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <ComponentWithResources
        {...props}
        definition={{
          agents: new URL('agents/', props.apiUrls.reinventRoot)
        }}
      >
        {(isLoaded, data) => isLoaded ? (
          <ComponentWithObjects
            {...props}
            commitObjects={true}
            objectListURL={new URL('runs/', props.apiUrls.reinventRoot)}
            emptyClassName="Runs"
            render={(runData, x, handleAdd, handleDelete, requestUpdate) => {
              const runs = runData.Runs || [];
              return (
                <React.Fragment>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h5>Create Run
                      {runs.length > 0 && (
                        <Badge color="warning" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                          {runs.length} run{runs.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </h5>
                    <p style={{ color: "#6c757d" }}>
                      Define a reinforcement learning experiment (environment is auto-selected from agent)
                    </p>
                  </div>

                  <RunForm
                    agents={data.agents || []}
                    title="Runs"
                    currentProject={props.currentProject}
                    onAdd={handleAdd}
                    requestUpdate={requestUpdate}
                  />

                  {runs.length > 0 && (
                    <React.Fragment>
                      <hr style={{ margin: "2rem 0" }}/>
                      <h6>🎯 Your Runs</h6>
                      <RunList data={runs} title="Runs" onDelete={handleDelete}/>
                    </React.Fragment>
                  )}
                </React.Fragment>
              );
            }}
          />
        ) : <div>⏳ Loading...</div>}
      </ComponentWithResources>
    </div>
  );
}

function RunForm(props) {
  const agents = props.agents || [];

  if (agents.length === 0) {
    return <Alert color="warning">No agents available. Create one in the Agents tab.</Alert>;
  }

  const schema = {
    type: "object",
    required: ["name", "agent"],
    properties: {
      name: {
        type: "string",
        title: "Run Name (Required)",
        minLength: 1
      },
      description: {
        type: "string",
        title: "Description (Optional)"
      },
      agent: {
        type: "integer",
        title: "Agent (Required)",
        enum: agents.map(item => item.id),
        enumNames: agents.map(item => `Agent ${item.id} (Env: ${item.environment?.name || item.environment || 'N/A'})`)
      },
      device: {
        type: "string",
        title: "Device",
        enum: ["cpu", "cuda:0", "cuda:1"],
        enumNames: ["CPU", "GPU (cuda:0)", "GPU (cuda:1)"],
        default: "cpu"
      },
      build: {
        type: "boolean",
        title: "Start Staged Learning Immediately",
        default: false
      }
    }
  };

  return (
    <Form
      showErrorList={false}
      schema={schema}
      uiSchema={{
        description: {"ui:widget": "textarea"},
        agent: {"ui:widget": "select", "ui:help": "The agent already includes its environment"},
        device: {"ui:widget": "select", "ui:help": "Select CPU or GPU device (macOS users should use CPU)"},
        build: {"ui:widget": "checkbox"}
      }}
      onError={errors => console.error("Run form errors:", errors)}
      onSubmit={(data) => {
        const payload = {
          project: props.currentProject.id,
          name: String(data.formData.name),
          description: String(data.formData.description || ""),
          agent: Number(data.formData.agent),
          device: String(data.formData.device || "cpu"),
          build: Boolean(data.formData.build || false)
        };
        console.log("Run payload:", payload);
        const result = props.onAdd(props.title, payload);

        // Request update to refresh the list
        if (props.requestUpdate) {
          setTimeout(() => {
            props.requestUpdate();
          }, 300);
        }

        return result;
      }}
    >
      <Button type="submit" color="warning" size="lg" style={{ fontWeight: "600" }}>
        ➕ Create Run
      </Button>
    </Form>
  );
}

function RunList(props) {
  const runs = React.useMemo(() => props.data || [], [props.data]);
  const [expandedId, setExpandedId] = React.useState(null);
  const [results, setResults] = React.useState({});
  const [taskStatus, setTaskStatus] = React.useState({});

  const parseCsv = (csvText) => {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      return { headers: [], data: [] };
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());
    const dataLines = lines.slice(1);

    const data = dataLines.map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => {
        const val = values[i]?.trim() || '';
        // Try to parse as number if it looks like one
        row[h] = !isNaN(val) && val !== '' ? parseFloat(val) : val;
      });
      return row;
    }).filter(row => row.SMILES || row.smiles);

    return { headers, data };
  };

  React.useEffect(() => {
    const pollTasks = () => {
      runs.forEach(run => {
        // Poll task status
        const tasksUrl = `/api/generators/reinvent/runs/${run.id}/tasks/all/`;
        fetch(tasksUrl, { credentials: "include" })
          .then(r => r.json())
          .then(data => {
            const allTasks = Object.values(data || {}).flat();
            const runningStates = new Set(['STARTED', 'PROGRESS', 'PENDING', 'RECEIVED', 'RETRY']);
            const isRunning = allTasks.some(task => runningStates.has(task.status));
            const hasCompleted = allTasks.some(task => task.status === 'SUCCESS');
            console.log(`[UI] Run ${run.id}: isRunning=${isRunning}, hasCompleted=${hasCompleted}, tasksCount=${allTasks.length}`);
            setTaskStatus(prev => ({
              ...prev,
              [run.id]: { isRunning, hasCompleted, tasks: allTasks }
            }));
          })
          .catch(err => {
            console.log(`Task status fetch failed for run ${run.id}:`, err.message);
          });

        // Fetch CSV results if completed and not already loaded
        const status = taskStatus[run.id];
        if (!results[run.id] && status?.hasCompleted && !status?.isRunning) {
          const csvUrl = `/api/generators/reinvent/runs/${run.id}/download-results/`;
          fetch(csvUrl, { credentials: "include" })
            .then(r => {
              if (r.ok) return r.text();
              throw new Error('No results yet');
            })
            .then(csv => {
              const parsed = parseCsv(csv);
              if (parsed.data && parsed.data.length > 0) {
                setResults(prev => ({ ...prev, [run.id]: parsed }));
              }
            })
            .catch(err => {
              console.log(`No results for run ${run.id}:`, err.message);
            });
        }
      });
    };

    pollTasks();
    const intervalId = setInterval(pollTasks, 5000);
    return () => clearInterval(intervalId);
  }, [runs, results, taskStatus]);

  return (
    <CardGrid
      data={runs}
      itemDataComponent={({item}) => {
        const runResults = results[item.id];
        const status = taskStatus[item.id];
        const isRunning = status?.isRunning;
        const hasCompleted = status?.hasCompleted;
        const isExpanded = expandedId === item.id;

        return (
          <React.Fragment>
            <Badge color="warning">ID: {item.id}</Badge>
            {isRunning && (
              <Badge color="info" style={{ marginLeft: "0.5rem" }}>
                ⏳ Running...
              </Badge>
            )}
            {hasCompleted && !isRunning && (
              <Badge color="success" style={{ marginLeft: "0.5rem" }}>
                ✓ Completed
              </Badge>
            )}
            {!isRunning && !hasCompleted && status !== undefined && (
              <Badge color="secondary" style={{ marginLeft: "0.5rem" }}>
                Not Started
              </Badge>
            )}
            {status === undefined && (
              <Badge color="dark" style={{ marginLeft: "0.5rem" }}>
                ⏳ Checking status...
              </Badge>
            )}
            <div style={{ fontSize: "1rem", fontWeight: "500", marginTop: "0.5rem" }}>{item.name || `Run ${item.id}`}</div>
            {item.description && <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>{item.description}</div>}
            <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
              <em>Environment:</em> {item.environment}<br/>
              <em>Agent:</em> {item.agent}
            </div>

            {isRunning && (
              <div style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: "#e7f3ff",
                borderRadius: "4px",
                textAlign: "center",
                color: "#004085",
                border: "1px solid #b3d9ff"
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  ⏳ Staged Learning is running...
                </div>
                <div style={{ fontSize: "0.9rem" }}>
                  Task ID: {status?.tasks?.[0]?.id || 'Processing...'}
                </div>
                <div style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "#0056b3" }}>
                  Results will be available in Compounds → Generated Sets when complete
                </div>
              </div>
            )}

            {hasCompleted && !isRunning && (
              <div style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: "#d4edda",
                borderRadius: "4px",
                textAlign: "center",
                color: "#155724",
                border: "1px solid #c3e6cb"
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  ✓ Task Completed Successfully!
                </div>
                <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                  Generated molecules have been saved.
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <a href={`/project/${props.currentProject?.id || ''}/compounds?tab=GeneratedMolSet`}
                     style={{
                       display: "inline-block",
                       padding: "0.5rem 1rem",
                       backgroundColor: "#28a745",
                       color: "white",
                       textDecoration: "none",
                       borderRadius: "4px",
                       fontWeight: "600"
                     }}>
                    📊 View Results in Compounds
                  </a>
                </div>
              </div>
            )}

            {runResults && runResults.data && runResults.data.length > 0 && (
              <React.Fragment>
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #dee2e6" }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0066cc",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: "0.9rem"
                    }}
                  >
                    {isExpanded ? "▼ Hide" : "▶ Show"} Raw CSV Data ({runResults.data.length} rows)
                  </button>
                </div>

                {isExpanded && runResults.headers && runResults.data && (
                  <div style={{
                    marginTop: "1rem",
                    maxHeight: "500px",
                    overflowY: "auto",
                    overflowX: "auto",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    padding: "0.5rem"
                  }}>
                    <table style={{
                      width: "100%",
                      fontSize: "0.75rem",
                      borderCollapse: "collapse"
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                          {runResults.headers.map((header, idx) => (
                            <th key={idx} style={{
                              padding: "0.5rem 0.25rem",
                              textAlign: header.toLowerCase().includes('smiles') ? 'left' : 'center',
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                              position: "sticky",
                              top: 0,
                              backgroundColor: "#f8f9fa",
                              zIndex: 1
                            }}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {runResults.data.slice(0, 100).map((row, idx) => (
                          <tr key={idx} style={{
                            borderBottom: "1px solid #f1f3f5",
                            backgroundColor: idx % 2 ? "#f8f9fa" : "white"
                          }}>
                            {runResults.headers.map((header, colIdx) => {
                              const value = row[header];
                              const isSmiles = header.toLowerCase().includes('smiles');
                              const isNumeric = typeof value === 'number';

                              return (
                                <td key={colIdx} style={{
                                  padding: "0.25rem",
                                  textAlign: isSmiles ? 'left' : 'center',
                                  fontFamily: isSmiles ? 'monospace' : 'inherit',
                                  fontSize: isSmiles ? '0.7rem' : '0.75rem',
                                  wordBreak: isSmiles ? 'break-all' : 'normal'
                                }}>
                                  {isSmiles && typeof value === 'string' ?
                                    value.substring(0, 50) + (value.length > 50 ? '...' : '') :
                                    isNumeric ? value.toFixed(4) :
                                    value !== undefined && value !== null ? value : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {runResults.data.length > 100 && (
                      <div style={{ padding: "0.5rem", textAlign: "center", color: "#6c757d", fontSize: "0.75rem" }}>
                        Showing first 100 of {runResults.data.length} molecules
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            )}
          </React.Fragment>
        );
      }}
      onDelete={(item) => props.onDelete(props.title, item)}
    />
  );
}

// =====================================================================
// MULTI-STAGE LEARNING TAB
// =====================================================================
function StagesSection(props) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <ComponentWithResources
          {...props}
          definition={{
            runs: new URL('runs/', props.apiUrls.reinventRoot),
            networks: new URL(`networks/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot)
          }}
        >
          {(isLoaded, data) => isLoaded ? (
            <ComponentWithObjects
              {...props}
              commitObjects={true}
              objectListURL={new URL('stages/', props.apiUrls.reinventRoot)}
              emptyClassName="Stages"
              render={(stageData, x, handleAdd, handleDelete, requestUpdate) => {
                const stages = stageData.Stages || [];
                return (
                  <React.Fragment>
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h5>Create Stage
                        {stages.length > 0 && (
                          <Badge color="secondary" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                            {stages.length} stage{stages.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h5>
                      <p style={{ color: "#6c757d" }}>
                        Define sequential learning stages with checkpoints
                      </p>
                    </div>

                    <StageForm
                      runs={data.runs || []}
                      schemes={data.schemes || []}
                      networks={data.networks || []}
                      title="Stages"
                      onAdd={handleAdd}
                      requestUpdate={requestUpdate}
                    />

                    {stages.length > 0 && (
                      <React.Fragment>
                        <hr style={{ margin: "2rem 0" }}/>
                        <h6>📅 Your Stages</h6>
                        <StageList
                          data={stages}
                          title="Stages"
                          runs={data.runs || []}
                          schemes={data.schemes || []}
                          networks={data.networks || []}
                          onDelete={handleDelete}
                          apiUrls={props.apiUrls}
                          onUpdate={requestUpdate}
                        />
                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              }}
            />
          ) : <div>⏳ Loading...</div>}
        </ComponentWithResources>
    </div>
  );
}

function StageForm(props) {
  const runs = props.runs || [];
  const schemes = props.schemes || [];
  const networks = props.networks || [];

  if (runs.length === 0) {
    return <Alert color="warning">No runs available. Create one in the Runs tab.</Alert>;
  }

  const schema = {
    type: "object",
    required: ["generator"],
    properties: {
      generator: {
        type: "integer",
        title: "Run (Required)",
        enum: runs.map(item => item.id),
        enumNames: runs.map(item => item.name || `Run ${item.id}`)
      },
      order: {type: "integer", title: "Order", default: 1, minimum: 1},
      termination_type: {type: "string", title: "Termination Type", default: "simple"},
      max_score: {type: "number", title: "Max Score", default: 1.0, minimum: 0},
      min_steps: {type: "integer", title: "Min Steps", default: 1, minimum: 1},
      max_steps: {type: "integer", title: "Max Steps", default: 100, minimum: 1},
      scoring_source: {type: "string", title: "Scoring Source", enum: ["inline", "file"], default: "inline"},
      scoring_scheme: {
        type: "integer",
        title: "Scoring Scheme (Optional)",
        enum: [0, ...schemes.map(item => item.id)],
        enumNames: ["None", ...schemes.map(item => item.aggregation_type || `Scheme ${item.id}`)]
      },
      chkpt_net: {
        type: "integer",
        title: "Checkpoint Net (Optional)",
        enum: [0, ...networks.map(item => item.id)],
        enumNames: ["None", ...networks.map(item => item.name || `Network ${item.id}`)]
      }
    }
  };

  return (
    <Form
      showErrorList={false}
      schema={schema}
      uiSchema={{
        generator: {"ui:widget": "select"},
        scoring_scheme: {"ui:widget": "select"},
        chkpt_net: {"ui:widget": "select"},
        scoring_source: {"ui:widget": "select"}
      }}
      onError={errors => console.error("Stage form errors:", errors)}
      onSubmit={(data) => {
        const payload = {
          generator: Number(data.formData.generator),
          order: Number(data.formData.order),
          termination_type: String(data.formData.termination_type || "simple"),
          max_score: Number(data.formData.max_score || 1.0),
          min_steps: Number(data.formData.min_steps || 1),
          max_steps: Number(data.formData.max_steps || 100),
          scoring_source: String(data.formData.scoring_source || "inline"),
          scoring_scheme: data.formData.scoring_scheme ? Number(data.formData.scoring_scheme) : null,
          scoring_file: null,
          chkpt_net: data.formData.chkpt_net ? Number(data.formData.chkpt_net) : null,
          chkpt_file: null
        };
        const result = props.onAdd(props.title, payload);

        // Request update to refresh the list
        if (props.requestUpdate) {
          setTimeout(() => {
            props.requestUpdate();
          }, 300);
        }

        return result;
      }}
    >
      <Button type="submit" color="secondary" size="lg" style={{ fontWeight: "600" }}>
        ➕ Create Stage
      </Button>
    </Form>
  );
}

function StageList(props) {
  const stages = props.data || [];
  const runMap = Object.fromEntries((props.runs || []).map(r => [r.id, r.name]));
  const schemeMap = Object.fromEntries((props.schemes || []).map(s => [s.id, s.aggregation_type]));
  const netMap = Object.fromEntries((props.networks || []).map(n => [n.id, n.name]));

  return (
    <CardGrid
      data={stages}
      itemDataComponent={({item}) => (
        <React.Fragment>
          <Badge color="secondary">Stage {item.order}</Badge>
          <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            <em>Run:</em> {runMap[item.generator] || item.generator}<br/>
            <em>Termination:</em> {item.termination_type}<br/>
            <em>Steps:</em> {item.min_steps} - {item.max_steps}<br/>
            <em>Scoring:</em> {item.scoring_source}<br/>
            {item.scoring_scheme && <><em>Scheme:</em> {schemeMap[item.scoring_scheme] || item.scoring_scheme}<br/></>}
            {item.chkpt_net && <><em>Checkpoint:</em> {netMap[item.chkpt_net] || item.chkpt_net}</>}
          </div>
        </React.Fragment>
      )}
      onDelete={(item) => props.onDelete(props.title, item)}
    />
  );
}

// =====================================================================
// MAIN PAGE
// =====================================================================
export default function RunsPage(props) {
  const [activeTab, setActiveTab] = React.useState("Agents");

  const tabs = [
    {
      title: "Agents",
      renderedComponent: () => <AgentsSection {...props} />
    },
    {
      title: "Create Runs",
      renderedComponent: () => <RunsSection {...props} />
    },
    {
      title: "View Runs",
      renderedComponent: () => <RunsGridPage {...props} />
    },
    {
      title: "Multi-Stage Learning",
      renderedComponent: () => <StagesSection {...props} />
    }
  ];

  return (
    <Container fluid style={{ padding: "2rem" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>Staged Learning Workflow</h1>
        <div style={{
          padding: "1.5rem",
          backgroundColor: "#e7f3ff",
          borderRadius: "8px",
          border: "1px solid #b3d9ff"
        }}>
          <h5 style={{ marginTop: 0, color: "#004085" }}>📋 Complete Workflow</h5>
          <p style={{ marginBottom: 0 }}>
            Follow these steps to set up and run reinforcement learning experiments:
          </p>
          <ol style={{ marginBottom: 0, marginTop: "0.5rem" }}>
            <li><strong>Training Config:</strong> Define how agents learn</li>
            <li><strong>Validation Config:</strong> (Optional) Track performance</li>
            <li><strong>Agents Tab:</strong> Combine environment + training</li>
            <li><strong>Create Runs Tab:</strong> Create new RL experiments</li>
            <li><strong>View Runs Tab:</strong> Monitor running experiments with logs & task tracking</li>
            <li><strong>Multi-Stage Learning Tab:</strong> Define staged checkpoints</li>
          </ol>
        </div>
      </div>

      <Row>
        <Col xs="12">
          {/* Configuration Sections - Always Visible */}
          <AgentTrainingSection {...props}/>
          <AgentValidationSection {...props}/>

          {/* Tabbed Sections */}
          <div style={{ marginTop: "2rem" }}>
            <TabWidget
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

import React from "react";
import Form from "@rjsf/bootstrap-4";
import { Container, Card, CardBody, CardHeader, Button, Badge, Alert, PopoverBody, PopoverHeader, UncontrolledPopover } from 'reactstrap';
import { TabWidget, ComponentWithObjects, ComponentWithResources } from '../../../../../genui';
import { RunCard } from './RunCard';
import CardGrid from '../objective/CardGrid';

// ─── HelpButton Component ──────────────────────────────────────────────────────
let _helpCounter = 0;
function HelpButton({ title, children }) {
  const [id] = React.useState(() => `help-agents-${++_helpCounter}`);
  return (
    <>
      <button
        id={id}
        type="button"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "18px", height: "18px", borderRadius: "50%",
          border: "1.5px solid #6c757d", background: "transparent",
          color: "#6c757d", fontSize: "11px", fontWeight: "bold",
          cursor: "pointer", lineHeight: 1, padding: 0,
          marginLeft: "6px", verticalAlign: "middle", flexShrink: 0,
        }}
      >?</button>
      <UncontrolledPopover trigger="legacy" placement="right" target={id}>
        {title && <PopoverHeader>{title}</PopoverHeader>}
        <PopoverBody style={{ fontSize: "0.85rem", maxWidth: "300px" }}>{children}</PopoverBody>
      </UncontrolledPopover>
    </>
  );
}

// Import all component sections from original RunsPage
// These will be defined below

export default function StagedLearningRouter(props) {
  const [activeTab, setActiveTab] = React.useState("Agents");

  const tabs = [
    {
      title: "Agents",
      renderedComponent: () => <AgentsPageContent {...props} />
    },
    {
      title: "Runs",
      renderedComponent: () => <CreateRunsPageContent {...props} />
    },
    {
      title: "Generated Molecules",
      renderedComponent: () => <GeneratedMoleculesPageContent {...props} />
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
          <h5 style={{ marginTop: 0, color: "#004085" }}>📋 Workflow Overview</h5>
          <p style={{ marginBottom: 0 }}>
            Navigate through the tabs to configure and execute reinforcement learning experiments:
          </p>
          <ul style={{ marginBottom: 0, marginTop: "0.5rem" }}>
            <li><strong>1. Agents:</strong> Configure training settings and create a named agent</li>
            <li><strong>2. Runs:</strong> Create a run with inline stages and scoring components, then start training</li>
            <li><strong>3. Generated Molecules:</strong> Browse, filter and generate molecule sets from completed runs</li>
          </ul>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <TabWidget
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </Container>
  );
}

// =====================================================================
// AGENTS PAGE CONTENT — unified single-form agent creator
// =====================================================================
function AgentsPageContent(props) {
  return (
    <ComponentWithResources
      {...props}
      definition={{
        networks: new URL(`networks/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
        environments: new URL(`environments/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
        algorithms: new URL('algorithms/', props.apiUrls.generatorsRoot),
      }}
    >
      {(isLoaded, resources) => isLoaded ? (
        <ComponentWithObjects
          {...props}
          commitObjects={false}
          objectListURL={new URL('agents/', props.apiUrls.reinventRoot)}
          emptyClassName="Agents"
          render={(agentData, x, _handleAdd, handleDelete, requestUpdate) => {
            const agents = agentData.Agents || [];
            return (
              <React.Fragment>
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ marginBottom: "0.5rem" }}>
                    Create Agent
                    {agents.length > 0 && (
                      <Badge color="success" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                        {agents.length} agent{agents.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </h4>
                  <p style={{ color: "#6c757d", marginBottom: 0 }}>
                    Define a named agent with its training and optional validation settings in one step.
                    The agent can then be selected when creating a staged-learning run.
                  </p>
                </div>

                <UnifiedAgentForm
                  {...props}
                  networks={resources.networks || []}
                  environments={resources.environments || []}
                  algorithms={resources.algorithms}
                  requestUpdate={requestUpdate}
                />

                {agents.length > 0 && (
                  <React.Fragment>
                    <hr style={{ margin: "2rem 0" }}/>
                    <h5 style={{ marginBottom: "1rem" }}>🤖 Your Agents</h5>
                    <CardGrid
                      data={agents}
                      itemDataComponent={({item}) => (
                        <React.Fragment>
                          <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                            {item.name || `Agent ${item.id}`}
                          </div>
                          {item.description && (
                            <div style={{ fontSize: "0.85rem", color: "#6c757d", marginBottom: "0.5rem" }}>
                              {item.description}
                            </div>
                          )}
                          <div style={{ fontSize: "0.85rem" }}>
                            <em>Environment:</em> {item.environment_name || `ID: ${item.environment}`}<br/>
                            <em>Training:</em> {item.training_info
                              ? `batch=${item.training_info.batch_size}, lr=${item.training_info.rate}, σ=${item.training_info.sigma}`
                              : (item.training || "None")}<br/>
                            <em>Validation:</em> {item.validation_info
                              ? `Validate every ${item.validation_info.validate_every} steps`
                              : "None"}
                          </div>
                        </React.Fragment>
                      )}
                      onDelete={(item) => handleDelete("Agents", item)}
                    />
                  </React.Fragment>
                )}

                {agents.length === 0 && (
                  <Alert color="info" style={{ marginTop: "2rem" }}>
                    <h6>ℹ️ No agents yet</h6>
                    Fill in the form above and click <strong>Create Agent</strong> to get started.
                  </Alert>
                )}
              </React.Fragment>
            );
          }}
        />
      ) : <div>⏳ Loading resources...</div>}
    </ComponentWithResources>
  );
}

// ---------------------------------------------------------------------------
// Unified agent creation form — training + validation + agent in one submit
// ---------------------------------------------------------------------------
function UnifiedAgentForm(props) {
  const networks = props.networks || [];
  const environments = props.environments || [];

  const [enableValidation, setEnableValidation] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Resolve algorithm / mode IDs once
  const [algorithmId, setAlgorithmId] = React.useState(null);
  const [modeId, setModeId] = React.useState(null);

  React.useEffect(() => {
    let algos = [];
    if (props.algorithms && Array.isArray(props.algorithms)) {
      algos = props.algorithms;
    } else if (props.algorithms?.results) {
      algos = props.algorithms.results;
    }
    if (algos.length > 0) {
      const reinventAlgo = algos.find(a => a.name === "ReinventNet");
      if (reinventAlgo) {
        setAlgorithmId(reinventAlgo.id);
        const agentMode = reinventAlgo.validModes?.find(m => m.name === "ReinventAgent");
        if (agentMode) setModeId(agentMode.id);
      }
    }
    if (!algorithmId || !modeId) {
      fetch('/api/generators/algorithms/')
        .then(r => r.json())
        .then(data => {
          let a = Array.isArray(data) ? data : (data.results || []);
          const ra = a.find(x => x.name === "ReinventNet");
          if (ra) {
            setAlgorithmId(ra.id);
            const am = ra.validModes?.find(m => m.name === "ReinventAgent");
            if (am) setModeId(am.id);
          }
        })
        .catch(() => {});
    }
  }, [props.algorithms]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (environments.length === 0) {
    return <Alert color="warning">No environments available. Create one in the Environment Creator tab first.</Alert>;
  }

  const schema = {
    type: "object",
    required: ["agentName", "environment"],
    properties: {
      agentName: {type: "string", title: "Agent Name", minLength: 1},
      agentDescription: {type: "string", title: "Description (Optional)"},
      environment: {
        type: "integer",
        title: "Environment",
        enum: environments.map(e => e.id),
        enumNames: environments.map(e => e.name || `Environment ${e.id}`)
      },
      batch_size: {type: "integer", title: "Batch Size", default: 64},
      rate: {type: "number", title: "Learning Rate", default: 0.0001},
      sigma: {type: "number", title: "Sigma", default: 128.0},
      ...(enableValidation ? {
        validate_every: {type: "integer", title: "Validate Every N Steps", default: 50},
      } : {})
    }
  };

  const uiSchema = {
    agentName: {
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Agent Name
        <HelpButton title="Agent Name">
          A unique, descriptive label for this agent. Will appear in dropdowns and run configurations. For example: "QED_Optimizer", "MW_Explorer", or "Scaffold_Diversity".
        </HelpButton>
      </span>
    },
    agentDescription: {
      "ui:widget": "textarea",
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Description (Optional)
        <HelpButton title="Description">
          Free-text notes about this agent's purpose, settings, or expected behavior. Helps document why this agent was created and what optimization goals it targets.
        </HelpButton>
      </span>
    },
    environment: {
      "ui:widget": "select",
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Environment
        <HelpButton title="Environment">
          The RL environment that defines the reward/scoring logic for this agent. Environments contain the scorers (Property, Model, SMARTS) and diversity filters that drive molecular optimization.
        </HelpButton>
      </span>
    },
    batch_size: {
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Batch Size
        <HelpButton title="Batch Size">
          Number of molecules generated and evaluated per training step. Larger batches stabilize learning but use more memory. Typical range: 32–256. Start with 64 and adjust based on GPU memory.
        </HelpButton>
      </span>
    },
    rate: {
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Learning Rate
        <HelpButton title="Learning Rate">
          Controls how fast the network adapts during training. Higher values train faster but risk instability; lower values train slower but more carefully. Typical range: 1e-5 to 1e-3. Default 1e-4 works well for most cases.
        </HelpButton>
      </span>
    },
    sigma: {
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Sigma
        <HelpButton title="Sigma">
          Temperature parameter that controls exploration vs. exploitation. Higher sigma = more random, diverse samples; lower sigma = focus on high-scoring regions. Typical range: 60–200. Default 128 balances both.
        </HelpButton>
      </span>
    },
    validate_every: {
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Validate Every N Steps
        <HelpButton title="Validate Every N Steps">
          How frequently to evaluate the agent on the validation dataset (if provided). Lower values = more frequent checks but slower training. Typical: 50–100 steps.
        </HelpButton>
      </span>
    }
  };

  // Helper: POST JSON and return parsed response (throws on HTTP error)
  const postJSON = async (url, body) => {
    const resp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(json));
    return json;
  };

  const handleSubmit = async (formObj) => {
    const d = formObj.formData;
    setSubmitting(true);
    setError(null);
    try {
      // Auto-resolve modelInstance from the selected environment's network
      const selectedEnv = environments.find(e => e.id === Number(d.environment));
      const resolvedModelInstance =
        (selectedEnv && selectedEnv.agent_net) ||
        (selectedEnv && selectedEnv.prior_net) ||
        (networks.length > 0 ? networks[0].id : null);

      if (!resolvedModelInstance) {
        throw new Error("Could not determine the ReinventNet model from the selected environment. Make sure the environment has a Prior or Agent network assigned.");
      }

      // 1) Create training config
      const trainingPayload = {
        algorithm: algorithmId || 1,
        mode: modeId || 1,
        modelInstance: resolvedModelInstance,
        batch_size: Number(d.batch_size || 64),
        rate: Number(d.rate || 0.0001),
        sigma: Number(d.sigma || 128.0),
        learning_type: "dap",
        unique_sequences: true,
        randomize_smiles: true,
        tb_isim: false,
        use_checkpoint: false,
        purge_memories: false,
        summary_csv_prefix: "reinvent"
      };
      const trainingResult = await postJSON(
        new URL('agent-training/', props.apiUrls.reinventRoot).href,
        trainingPayload
      );

      // 2) Optionally create validation config
      let validationId = null;
      if (enableValidation) {
        const valPayload = {
          modelInstance: resolvedModelInstance,
          validate_every: Number(d.validate_every || 50),
          metrics: []
        };
        const valResult = await postJSON(
          new URL('agent-validation/', props.apiUrls.reinventRoot).href,
          valPayload
        );
        validationId = valResult.id;
      }

      // 3) Create the agent itself
      const agentPayload = {
        name: String(d.agentName),
        description: String(d.agentDescription || ""),
        environment: Number(d.environment),
        training: trainingResult.id,
        validation: validationId
      };
      await postJSON(
        new URL('agents/', props.apiUrls.reinventRoot).href,
        agentPayload
      );

      // Refresh agent list
      if (props.requestUpdate) props.requestUpdate();
    } catch (err) {
      console.error("Agent creation failed:", err);
      setError(String(err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <CardHeader style={{ backgroundColor: "#28a745", color: "white" }}>
        <h5 style={{ margin: 0 }}>🤖 New Agent</h5>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert color="danger" toggle={() => setError(null)}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        <Form
          showErrorList={false}
          schema={schema}
          uiSchema={uiSchema}
          onError={errors => console.error("Agent form errors:", errors)}
          onSubmit={handleSubmit}
          disabled={submitting}
        >
          {/* Validation toggle (outside rjsf schema so it's a plain checkbox) */}
          <div style={{
            margin: "1rem 0",
            padding: "0.75rem 1rem",
            backgroundColor: "#f0f8ff",
            borderRadius: "6px",
            border: "1px solid #b3d9ff"
          }}>
            <label style={{ cursor: "pointer", fontWeight: "600", margin: 0 }}>
              <input
                type="checkbox"
                checked={enableValidation}
                onChange={(e) => setEnableValidation(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Enable Validation (Optional)
            </label>
            <div style={{ fontSize: "0.85rem", color: "#6c757d", marginTop: "0.25rem" }}>
              Track agent quality during training by validating periodically.
            </div>
          </div>

          <Button
            type="submit"
            color="success"
            size="lg"
            disabled={submitting}
            style={{ fontWeight: "600", marginTop: "0.5rem" }}
          >
            {submitting ? "⏳ Creating..." : "➕ Create Agent"}
          </Button>
        </Form>
      </CardBody>
    </Card>
  );
}

// =====================================================================
// CREATE RUNS PAGE CONTENT
// =====================================================================
function CreateRunsPageContent(props) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <ComponentWithResources
        {...props}
        definition={{
          agents: new URL(`agents/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
          propertyScorers: new URL(`property-scorers/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
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
                    <h2>Runs
                      {runs.length > 0 && (
                        <Badge color="warning" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                          {runs.length} run{runs.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </h2>
                    <p style={{ color: "#6c757d" }}>
                      Create a run with stages and scoring components, then start training
                    </p>
                  </div>

                  <RunForm
                    agents={data.agents || []}
                    propertyScorers={data.propertyScorers || []}
                    title="Runs"
                    currentProject={props.currentProject}
                    onAdd={handleAdd}
                    requestUpdate={requestUpdate}
                  />

                  {runs.length > 0 && (
                    <React.Fragment>
                      <hr style={{ margin: "2rem 0" }}/>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h4 style={{ margin: 0 }}>📝 Runs</h4>
                        <Button color="secondary" size="sm" onClick={requestUpdate}>
                          🔄 Refresh
                        </Button>
                      </div>
                      <RunList
                        data={runs}
                        title="Runs"
                        onDelete={handleDelete}
                        currentProject={props.currentProject}
                        apiUrls={props.apiUrls}
                        propertyScorers={data.propertyScorers || []}
                      />
                    </React.Fragment>
                  )}

                  {runs.length === 0 && (
                    <Alert color="info" style={{ marginTop: "2rem" }}>
                      <h6>ℹ️ No runs yet</h6>
                      Fill in the form above and click <strong>Create Run</strong> to start a new staged learning experiment.
                    </Alert>
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
  const propertyScorers = props.propertyScorers || [];

  // Inline stages state — start with one default stage
  const emptyStage = () => ({
    order: 1,
    termination_type: "simple",
    max_score: 1.0,
    min_steps: 1,
    max_steps: 100,
    aggregation_type: "geometric_mean",
    property_scorers: [],
  });
  const [stages, setStages] = React.useState([emptyStage()]);
  const [startImmediately, setStartImmediately] = React.useState(false);

  const updateStage = (idx, key, value) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  };
  const addStage = () => {
    setStages(prev => [...prev, { ...emptyStage(), order: prev.length + 1 }]);
  };
  const removeStage = (idx) => {
    setStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  };

  if (agents.length === 0) {
    return <Alert color="warning">No agents available. Create one in the Agents tab.</Alert>;
  }

  const totalScorers = propertyScorers.length;
  const anyStageHasScorers = stages.some(s =>
    s.property_scorers.length > 0
  );


  const schema = {
    type: "object",
    required: ["name", "agent"],
    properties: {
      name: { type: "string", title: "Run Name", minLength: 1 },
      description: { type: "string", title: "Description (Optional)" },
      agent: {
        type: "integer", title: "Agent",
        enum: agents.map(item => item.id),
        enumNames: agents.map(item => item.name || `Agent ${item.id}`)
      }
    }
  };

  return (
    <Form
      showErrorList={false}
      schema={schema}
      uiSchema={{
        description: { "ui:widget": "textarea" },
        agent: { "ui:widget": "select" },
      }}
      onError={errors => console.error("Run form errors:", errors)}
      onSubmit={(data) => {
        // Read bad SMARTS weight from localStorage (set in Scoring Components tab)
        const savedWeight = localStorage.getItem('genui_bad_smarts_weight');
        const badSmartsWeight = savedWeight !== null ? Number(savedWeight) : 1.0;

        const payload = {
          project: props.currentProject.id,
          name: String(data.formData.name),
          description: String(data.formData.description || ""),
          agent: Number(data.formData.agent),
          device: "auto",
          build: startImmediately,
          bad_smarts_weight: badSmartsWeight,
          stages: stages.map(s => ({
            order: s.order,
            termination_type: s.termination_type,
            max_score: s.max_score,
            min_steps: s.min_steps,
            max_steps: s.max_steps,
            scoring_source: "inline",
            aggregation_type: s.aggregation_type,
            property_scorers: s.property_scorers,
          })),
        };
        const result = props.onAdd(props.title, payload);
        if (props.requestUpdate) setTimeout(() => props.requestUpdate(), 300);
        // reset stages
        setStages([emptyStage()]);
        return result;
      }}
    >
      {/* ── Inline Stages Section ───────────────────────────── */}
      <div style={{
        margin: "1.5rem 0", padding: "1rem",
        backgroundColor: "#f0f8ff", borderRadius: "8px",
        border: "1px solid #b3d9ff"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h5 style={{ margin: 0, color: "#004085" }}>
            📅 Stages
            <Badge color="secondary" style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>{stages.length}</Badge>
          </h5>
          <Button color="primary" size="sm" type="button" onClick={addStage}>
            + Add Stage
          </Button>
        </div>

        {totalScorers === 0 && (
          <Alert color="info" style={{ marginBottom: "1rem" }}>
            No property scorers created yet. Go to the <strong>Scoring Components</strong> tab to create
            Property scorers first. Bad SMARTS penalty is included automatically.
          </Alert>
        )}

        {stages.map((stage, idx) => (
          <Card key={idx} style={{ marginBottom: "1rem", border: "1px solid #dee2e6" }}>
            <CardHeader style={{ backgroundColor: "#e9ecef", padding: "0.5rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Stage {stage.order}</strong>
              {stages.length > 1 && (
                <Button color="link" size="sm" type="button" style={{ color: "#dc3545", padding: 0 }}
                  onClick={() => removeStage(idx)}>✕ Remove</Button>
              )}
            </CardHeader>
            <CardBody style={{ padding: "1rem" }}>
              {/* Stage parameters in a compact grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#6c757d", display: "flex", alignItems: "center" }}>
                    Max Steps
                    <HelpButton title="Max Steps">
                      The maximum number of RL training steps this stage will run. If the stage does not reach <em>Max Score</em> first, training stops here and advances to the next stage (or ends if this is the last stage). Increase for more thorough optimization; decrease for faster iteration.
                    </HelpButton>
                  </label>
                  <input type="number" className="form-control form-control-sm" value={stage.max_steps}
                    onChange={e => updateStage(idx, "max_steps", Number(e.target.value))} min={1} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#6c757d", display: "flex", alignItems: "center" }}>
                    Min Steps
                    <HelpButton title="Min Steps">
                      The minimum number of steps that must complete before early-stopping via <em>Max Score</em> is allowed. Prevents the stage from finishing too early on a lucky batch. Typically set to 10–20% of Max Steps.
                    </HelpButton>
                  </label>
                  <input type="number" className="form-control form-control-sm" value={stage.min_steps}
                    onChange={e => updateStage(idx, "min_steps", Number(e.target.value))} min={1} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#6c757d", display: "flex", alignItems: "center" }}>
                    Max Score
                    <HelpButton title="Max Score">
                      Early-stopping threshold (0–1). When the average score of generated molecules reaches this value <em>after</em> Min Steps, the stage is considered successful and training advances to the next stage. Set to 1.0 to always run until Max Steps.
                    </HelpButton>
                  </label>
                  <input type="number" className="form-control form-control-sm" value={stage.max_score}
                    onChange={e => updateStage(idx, "max_score", Number(e.target.value))} step={0.1} min={0} max={1} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#6c757d", display: "flex", alignItems: "center" }}>
                    Aggregation
                    <HelpButton title="Aggregation Type">
                      How individual scorer values are combined into a single reward signal.<br /><br />
                      <strong>Geometric Mean</strong> — multiplies all scores and takes the n-th root. A single zero zeroes the total, forcing the agent to satisfy <em>all</em> criteria. Recommended for most cases.<br /><br />
                      <strong>Arithmetic Mean</strong> — takes a weighted average. A weak score on one component can be compensated by a strong score on another.
                    </HelpButton>
                  </label>
                  <select className="form-control form-control-sm" value={stage.aggregation_type}
                    onChange={e => updateStage(idx, "aggregation_type", e.target.value)}>
                    <option value="geometric_mean">Geometric Mean</option>
                    <option value="arithmetic_mean">Arithmetic Mean</option>
                  </select>
                </div>
              </div>

              {/* Scorer assignment */}
              <div style={{ padding: "0.75rem", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #dee2e6" }}>
                <strong style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                  🎯 Scoring Components
                  {stage.property_scorers.length > 0 && (
                    <Badge color="success" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                      {stage.property_scorers.length} selected
                    </Badge>
                  )}
                  <HelpButton title="Scoring Components">
                    Property scorers that define the reward signal for this stage. Each selected scorer evaluates a molecular property (e.g. QED, LogP, MW) and returns a score in [0, 1]. Scores are combined using the stage's Aggregation type. At least one scorer must be assigned for training to work. Scorers are created in the <strong>Scoring Components</strong> tab.
                  </HelpButton>
                </strong>
                <ScorerMultiSelect label="🔬 Property Scorers" items={propertyScorers}
                  selected={stage.property_scorers} onChange={v => updateStage(idx, "property_scorers", v)} color="#007bff" />
                <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "0.5rem" }}>
                  🛡️ Bad SMARTS penalty is automatically included in every stage.
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Validation warning */}
      {!anyStageHasScorers && totalScorers > 0 && (
        <Alert color="warning" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
          ⚠️ None of the stages have scoring components assigned. Assign at least one scorer to at least one stage for training to work.
        </Alert>
      )}

      {/* Start immediately toggle */}
      <div style={{
        margin: "1rem 0",
        padding: "0.75rem 1rem",
        backgroundColor: "#f0f8ff",
        borderRadius: "6px",
        border: "1px solid #b3d9ff"
      }}>
        <label style={{ cursor: "pointer", fontWeight: "600", margin: 0 }}>
          <input
            type="checkbox"
            checked={startImmediately}
            onChange={(e) => setStartImmediately(e.target.checked)}
            style={{ marginRight: "0.5rem" }}
          />
          Start training immediately after creation
        </label>
      </div>

      <Button type="submit" color="warning" size="lg" style={{ fontWeight: "600" }}>
        ➕ Create Run
      </Button>
    </Form>
  );
}

// RunList renders each run as a full RunCard so Celery task status is visible in-place
function RunList(props) {
  const runs = props.data || [];
  return (
    <div>
      {runs.map(run => (
        <RunCard
          key={run.id}
          model={run}
          apiUrls={props.apiUrls}
          currentProject={props.currentProject}
          propertyScorers={props.propertyScorers || []}
          onDelete={(item) => props.onDelete(props.title, item)}
        />
      ))}
    </div>
  );
}

// =====================================================================
// GENERATED MOLECULES PAGE CONTENT
// =====================================================================
function GeneratedMoleculesPageContent(props) {
  const [runs, setRuns] = React.useState([]);
  const [selectedRunId, setSelectedRunId] = React.useState(null);
  const [molsets, setMolsets] = React.useState([]);         // all molsets for selected run
  const [activeMolsetId, setActiveMolsetId] = React.useState(null); // which one is open
  const [molecules, setMolecules] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [scoreFilter, setScoreFilter] = React.useState("");
  const [appliedScoreFilter, setAppliedScoreFilter] = React.useState("");
  const [loadingMolsets, setLoadingMolsets] = React.useState(false);
  const [loadingMols, setLoadingMols] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState(null);

  // Generate-new-set form state
  const [nSamples, setNSamples] = React.useState(100);
  const [minScore, setMinScore] = React.useState("");
  const [setName, setSetName] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState(null);
  const [generateSuccess, setGenerateSuccess] = React.useState(null);

  const reinventRoot = String(props.apiUrls?.reinventRoot || '/api/generators/reinvent/').replace(/\/?$/, '/');
  // compoundSetsRoot kept for generate POST
  const compoundSetsRoot = String(props.apiUrls?.compoundSetsRoot || '/api/compounds/sets/').replace(/\/?$/, '/');

  // ── Helpers ──────────────────────────────────────────────────────────
  const loadMolsets = React.useCallback((runId) => {
    if (!runId) return;
    setMolsets([]);
    setMolecules([]);
    setTotalCount(null);
    setActiveMolsetId(null);
    setLoadingMolsets(true);
    fetch(`${reinventRoot}runs/${runId}/generated-molecules/`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setLoadingMolsets(false);
        const list = data.molsets || [];
        setMolsets(list);
        if (list.length > 0) setActiveMolsetId(list[0].id);
      })
      .catch(() => setLoadingMolsets(false));
  }, [reinventRoot]);

  // ── Load runs for this project ────────────────────────────────────────
  React.useEffect(() => {
    fetch(`${reinventRoot}runs/?project_id=${props.currentProject.id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setRuns(list);
        if (list.length > 0) {
          setSelectedRunId(list[0].id);
          loadMolsets(list[0].id);
        }
      })
      .catch(() => {});
  }, [props.currentProject.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load molecules when active molset / page / applied score filter changes ──
  React.useEffect(() => {
    if (!activeMolsetId || !selectedRunId) { setMolecules([]); setTotalCount(null); return; }
    setLoadingMols(true);
    setMolecules([]);
    // Use the molset_molecules endpoint which joins CSV scores server-side
    let url = `${reinventRoot}runs/${selectedRunId}/generated-molecules/${activeMolsetId}/molecules/?page=${page}&page_size=${pageSize}`;
    if (appliedScoreFilter !== "") url += `&min_score=${appliedScoreFilter}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setLoadingMols(false);
        setMolecules(data.results || []);
        setTotalCount(data.count ?? (data.results || []).length);
      })
      .catch(() => setLoadingMols(false));
  }, [activeMolsetId, selectedRunId, page, pageSize, appliedScoreFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Score filter ──────────────────────────────────────────────────────
  // displayMols = molecules already filtered server-side; no client filtering needed
  const displayMols = molecules;

  const totalPages = totalCount !== null ? Math.ceil(totalCount / pageSize) : null;
  const selectedRun = runs.find(r => r.id === selectedRunId);
  const activeMolset = molsets.find(m => m.id === activeMolsetId);

  // ── Generate new set ──────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedRunId) return;
    setGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(null);
    try {
      const name = setName.trim() || `${selectedRun?.name || 'Run ' + selectedRunId} – Generated`;
      const body = {
        name,
        description: `Generated from: ${selectedRun?.name || 'Run ' + selectedRunId}`,
        project: props.currentProject.id,
        source: selectedRunId,
        nSamples: Number(nSamples),
        ...(minScore !== "" ? { minScore: parseFloat(minScore) } : {}),
      };
      const resp = await fetch(`${compoundSetsRoot}generated/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || data.error || JSON.stringify(data));
      setGenerateSuccess(`✅ Generation started! Set "${data.name || name}" is being populated. Refresh in a moment.`);
      setSetName("");
      setTimeout(() => loadMolsets(selectedRunId), 2000);
    } catch (err) {
      setGenerateError(String(err.message || err));
    } finally {
      setGenerating(false);
    }
  };

  // ── Delete a molset ────────────────────────────────────────────────────
  const handleDelete = async (molsetId) => {
    if (!window.confirm('Delete this molecule set? This cannot be undone.')) return;
    setDeletingId(molsetId);
    try {
      const resp = await fetch(`${reinventRoot}runs/${selectedRunId}/generated-molecules/${molsetId}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (resp.ok || resp.status === 204) {
        setMolsets(prev => prev.filter(m => m.id !== molsetId));
        if (activeMolsetId === molsetId) {
          const remaining = molsets.filter(m => m.id !== molsetId);
          setActiveMolsetId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (err) { /* ignore */ }
    setDeletingId(null);
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "1.5rem 2rem" }}>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>Generated Molecules</h3>
        <p style={{ color: "#6c757d", margin: "0.35rem 0 0" }}>
          Browse molecule sets generated by completed runs, filter by score, and export to SDF.
        </p>
      </div>

      {runs.length === 0 && (
        <Alert color="info">No runs found. Create a run in the <strong>Runs</strong> tab first.</Alert>
      )}

      {runs.length > 0 && (
        <>
          {/* ── Run selector bar ─────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
            padding: "0.75rem 1rem", backgroundColor: "#f8f9fa",
            borderRadius: "8px", border: "1px solid #dee2e6", marginBottom: "1.25rem",
          }}>
            <span style={{ fontWeight: 600, color: "#495057", fontSize: "0.9rem", whiteSpace: "nowrap" }}>Run:</span>
            <select
              className="form-control form-control-sm"
              style={{ maxWidth: "340px", fontWeight: 500 }}
              value={selectedRunId || ""}
              onChange={e => {
                const id = Number(e.target.value);
                setSelectedRunId(id);
                setPage(1);
                setScoreFilter("");
                setAppliedScoreFilter("");
                loadMolsets(id);
              }}
            >
              {runs.map(r => (
                <option key={r.id} value={r.id}>{r.name || `Run ${r.id}`}</option>
              ))}
            </select>
            {selectedRun?.description && (
              <span style={{ color: "#6c757d", fontSize: "0.85rem", fontStyle: "italic" }}>
                {selectedRun.description}
              </span>
            )}
            {loadingMolsets && (
              <span style={{ color: "#6c757d", fontSize: "0.85rem" }}>⏳ Loading…</span>
            )}
          </div>

          {/* ── Molset tabs ──────────────────────────────────────────── */}
          {!loadingMolsets && molsets.length === 0 && (
            <Alert color="light" style={{ border: "1px solid #dee2e6", marginBottom: "1.25rem" }}>
              No molecule sets for this run yet — use the <strong>Generate</strong> panel below to create one.
            </Alert>
          )}

          {!loadingMolsets && molsets.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              {/* Tab strip */}
              <div style={{
                display: "flex", gap: "0.4rem", flexWrap: "wrap",
                borderBottom: "2px solid #dee2e6", paddingBottom: "0",
                marginBottom: "0",
              }}>
                {molsets.map(ms => {
                  const isActive = activeMolsetId === ms.id;
                  return (
                    <div key={ms.id} style={{
                      display: "flex", alignItems: "center",
                      borderRadius: "6px 6px 0 0",
                      border: "1px solid " + (isActive ? "#dee2e6" : "transparent"),
                      borderBottom: isActive ? "2px solid #fff" : "1px solid transparent",
                      marginBottom: isActive ? "-2px" : "0",
                      backgroundColor: isActive ? "#fff" : "transparent",
                      overflow: "hidden",
                    }}>
                      <button
                        type="button"
                        onClick={() => { setActiveMolsetId(ms.id); setPage(1); setScoreFilter(""); setAppliedScoreFilter(""); }}
                        style={{
                          padding: "0.45rem 0.9rem",
                          background: "none", border: "none",
                          color: isActive ? "#212529" : "#6c757d",
                          fontWeight: isActive ? 600 : 400,
                          cursor: "pointer", fontSize: "0.88rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ms.name || `Set ${ms.id}`}
                        <span style={{
                          marginLeft: "0.4rem", padding: "0.1rem 0.45rem",
                          borderRadius: "10px", fontSize: "0.75rem",
                          backgroundColor: isActive ? "#0d6efd" : "#e9ecef",
                          color: isActive ? "#fff" : "#6c757d",
                        }}>
                          {ms.molecule_count}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Delete set"
                        disabled={deletingId === ms.id}
                        onClick={() => handleDelete(ms.id)}
                        style={{
                          padding: "0.3rem 0.5rem", background: "none",
                          border: "none", color: "#adb5bd",
                          cursor: "pointer", fontSize: "0.8rem", lineHeight: 1,
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "#dc3545"}
                        onMouseLeave={e => e.currentTarget.style.color = "#adb5bd"}
                      >
                        {deletingId === ms.id ? "…" : "✕"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Active molset panel */}
              {activeMolset && (
                <div style={{
                  border: "1px solid #dee2e6", borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  backgroundColor: "#fff", padding: "1rem 1.25rem",
                }}>
                  {/* Meta row */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "1.5rem",
                    flexWrap: "wrap", marginBottom: "1rem",
                    fontSize: "0.82rem", color: "#6c757d",
                  }}>
                    <span>
                      <strong style={{ color: "#495057" }}>Run:</strong>{" "}
                      {selectedRun?.name || `Run ${selectedRunId}`}
                    </span>
                    <span>
                      <strong style={{ color: "#495057" }}>Created:</strong>{" "}
                      {activeMolset.created ? new Date(activeMolset.created).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                    <span>
                      <strong style={{ color: "#495057" }}>Total molecules:</strong>{" "}
                      {activeMolset.molecule_count}
                    </span>
                  </div>

                  {/* Toolbar */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    flexWrap: "wrap", marginBottom: "1rem",
                    padding: "0.6rem 0.9rem",
                    backgroundColor: "#f8f9fa", borderRadius: "6px",
                    border: "1px solid #e9ecef",
                  }}>
                    {/* Score filter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <label style={{ margin: 0, fontSize: "0.83rem", fontWeight: 600, color: "#495057", whiteSpace: "nowrap" }}>
                        Score ≥
                        <HelpButton title="Score Filter">
                          Filter molecules by their REINVENT score (0–1). Press Enter or Apply to reload.
                        </HelpButton>
                      </label>
                      <input
                        type="number" step="0.01" min="0" max="1" placeholder="0.0"
                        value={scoreFilter}
                        onChange={e => setScoreFilter(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { setAppliedScoreFilter(scoreFilter); setPage(1); } }}
                        className="form-control form-control-sm"
                        style={{ width: "80px" }}
                      />
                      <Button size="sm" color="primary" style={{ whiteSpace: "nowrap" }}
                        onClick={() => { setAppliedScoreFilter(scoreFilter); setPage(1); }}>
                        Apply
                      </Button>
                      {appliedScoreFilter !== "" && (
                        <Button size="sm" color="outline-secondary"
                          onClick={() => { setScoreFilter(""); setAppliedScoreFilter(""); setPage(1); }}>
                          Clear
                        </Button>
                      )}
                    </div>

                    <div style={{ width: "1px", height: "24px", backgroundColor: "#dee2e6", flexShrink: 0 }} />

                    {/* Pagination */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Button size="sm" color="outline-secondary" disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}>‹</Button>
                      <span style={{ fontSize: "0.83rem", color: "#495057", whiteSpace: "nowrap" }}>
                        {page}{totalPages ? ` / ${totalPages}` : ""}&nbsp;
                        <span style={{ color: "#adb5bd" }}>
                          ({totalCount !== null ? `${totalCount} mol.` : "…"})
                        </span>
                      </span>
                      <Button size="sm" color="outline-secondary" disabled={!totalPages || page >= totalPages}
                        onClick={() => setPage(p => p + 1)}>›</Button>
                    </div>

                    {/* Per page */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <label style={{ margin: 0, fontSize: "0.83rem", color: "#6c757d", whiteSpace: "nowrap" }}>Per page:</label>
                      <select className="form-control form-control-sm" style={{ width: "62px" }}
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                    </div>

                    {/* Active filter badge */}
                    {appliedScoreFilter !== "" && (
                      <span style={{
                        marginLeft: "auto", fontSize: "0.78rem",
                        backgroundColor: "#cfe2ff", color: "#084298",
                        padding: "0.2rem 0.6rem", borderRadius: "12px",
                      }}>
                        Score ≥ {appliedScoreFilter}
                      </span>
                    )}
                  </div>

                  {/* Molecule content */}
                  {loadingMols && (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#6c757d" }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
                      Loading molecules…
                    </div>
                  )}
                  {!loadingMols && molecules.length === 0 && (
                    <Alert color="light" style={{ border: "1px solid #dee2e6", textAlign: "center" }}>
                      No molecules loaded yet. The generation task may still be running.
                    </Alert>
                  )}
                  {!loadingMols && molecules.length > 0 && displayMols.length === 0 && (
                    <Alert color="warning">
                      No molecules match score ≥ {appliedScoreFilter}. Try a lower threshold.
                    </Alert>
                  )}
                  {!loadingMols && displayMols.length > 0 && (
                    <MoleculeTable molecules={displayMols} apiUrls={props.apiUrls} />
                  )}

                  {/* Bottom pagination */}
                  {!loadingMols && displayMols.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
                      <Button size="sm" color="outline-secondary" disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}>‹ Prev</Button>
                      <span style={{ fontSize: "0.85rem", color: "#495057" }}>
                        Page {page}{totalPages ? ` of ${totalPages}` : ""}
                      </span>
                      <Button size="sm" color="outline-secondary" disabled={!totalPages || page >= totalPages}
                        onClick={() => setPage(p => p + 1)}>Next ›</Button>
                    </div>
                  )}

                  {/* SDF Export */}
                  <MolsetExportPanel molset={activeMolset} apiUrls={props.apiUrls} />
                </div>
              )}
            </div>
          )}

          {/* ── Generate new set ─────────────────────────────────────── */}
          <div style={{
            border: "1px solid #dee2e6", borderRadius: "8px",
            overflow: "hidden", marginTop: "0.5rem",
          }}>
            <div style={{
              padding: "0.75rem 1.25rem",
              backgroundColor: "#fffdf0", borderBottom: "1px solid #dee2e6",
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}>
              <span style={{ fontSize: "1rem" }}>⚗️</span>
              <strong style={{ fontSize: "0.95rem" }}>Generate New Molecule Set</strong>
            </div>
            <div style={{ padding: "1rem 1.25rem" }}>
              {generateError && (
                <Alert color="danger" toggle={() => setGenerateError(null)}>
                  {generateError}
                </Alert>
              )}
              {generateSuccess && (
                <Alert color="success" toggle={() => setGenerateSuccess(null)}>
                  {generateSuccess}
                </Alert>
              )}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ fontSize: "0.83rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                    Set Name
                    <HelpButton title="Set Name">Leave blank for a default name based on the run.</HelpButton>
                  </label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder={selectedRun ? `${selectedRun.name} – Generated` : ""}
                    value={setName} onChange={e => setSetName(e.target.value)} />
                </div>
                <div style={{ flex: "0 0 130px" }}>
                  <label style={{ fontSize: "0.83rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                    # Molecules
                    <HelpButton title="Number of Molecules">How many molecules to include in the generated set. Larger numbers take longer to process.</HelpButton>
                  </label>
                  <input type="number" min={1} className="form-control form-control-sm"
                    value={nSamples} onChange={e => setNSamples(Number(e.target.value))} />
                </div>
                <div style={{ flex: "0 0 150px" }}>
                  <label style={{ fontSize: "0.83rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                    Min Score
                    <HelpButton title="Min Score Threshold">Only include molecules with score ≥ this value (0–1). Leave empty to include all. To choose a good threshold, check the molecule count and score distribution in the <strong>Performance</strong> section of the run.</HelpButton>
                  </label>
                  <input type="number" step="0.01" min="0" max="1" placeholder="optional"
                    className="form-control form-control-sm"
                    value={minScore} onChange={e => setMinScore(e.target.value)} />
                </div>
                <div>
                  <Button color="warning" style={{ fontWeight: 600, whiteSpace: "nowrap" }}
                    onClick={handleGenerate} disabled={generating || !selectedRunId}>
                    {generating ? "⏳ Generating…" : "⚗️ Generate"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── MoleculeTable: shows structure, SMILES, InChI, score, properties ────────
const PROPS_LIST = ["AMW", "NUMHEAVYATOMS", "NUMAROMATICRINGS", "HBA", "HBD", "LOGP", "TPSA"];
const PROPS_LABELS = {
  AMW: "Mol. Weight", NUMHEAVYATOMS: "Heavy Atoms", NUMAROMATICRINGS: "Arom. Rings",
  HBA: "HBA", HBD: "HBD", LOGP: "LogP", TPSA: "TPSA",
};

function MoleculeRow({ mol, compoundsRoot }) {
  const [molProps, setMolProps] = React.useState(null);

  React.useEffect(() => {
    if (!mol.id || !compoundsRoot) { setMolProps({}); return; }
    const base = String(compoundsRoot).replace(/\/?$/, '/');
    fetch(`${base}${mol.id}/?properties=${PROPS_LIST.join(',')}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setMolProps(data.properties || {}))
      .catch(() => setMolProps({}));
  }, [mol.id, compoundsRoot]); // eslint-disable-line react-hooks/exhaustive-deps

  const score = mol.score ?? null;
  const scoreColor = score === null ? "#6c757d"
    : score >= 0.7 ? "#198754"
    : score >= 0.4 ? "#fd7e14"
    : "#dc3545";
  const scoreBg = score === null ? "#f8f9fa"
    : score >= 0.7 ? "#d1e7dd"
    : score >= 0.4 ? "#fff3cd"
    : "#f8d7da";

  return (
    <div style={{
      display: "flex", gap: "0", borderRadius: "8px",
      border: "1px solid #dee2e6", overflow: "hidden",
      backgroundColor: "#fff", marginBottom: "0.75rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {/* Structure */}
      <div style={{
        flexShrink: 0, width: "210px", minWidth: "210px",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0.75rem", borderRight: "1px solid #dee2e6",
        backgroundColor: "#fafafa",
      }}>
        <SmilesImage smiles={mol.smiles} size={190} />
      </div>

      {/* Main info */}
      <div style={{ flex: 1, padding: "0.85rem 1rem", minWidth: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>

        {/* Score badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.1rem" }}>
          {score !== null ? (
            <span style={{
              padding: "0.2rem 0.7rem", borderRadius: "12px",
              backgroundColor: scoreBg, color: scoreColor,
              fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.01em",
            }}>
              Score: {score.toFixed(4)}
            </span>
          ) : (
            <span style={{ color: "#adb5bd", fontSize: "0.85rem" }}>Score: —</span>
          )}
        </div>

        {/* SMILES */}
        <div>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.06em" }}>SMILES</span>
          <div style={{ marginTop: "0.15rem", padding: "0.3rem 0.5rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
            <code style={{ fontSize: "0.78rem", wordBreak: "break-all", color: "#212529", background: "none", display: "block", fontFamily: "monospace" }}>{mol.smiles}</code>
          </div>
        </div>

        {/* InChI */}
        {mol.inchi && (
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.06em" }}>InChI</span>
            <div style={{ marginTop: "0.15rem", padding: "0.3rem 0.5rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
              <code style={{ fontSize: "0.74rem", wordBreak: "break-all", color: "#495057", background: "none", display: "block", fontFamily: "monospace" }}>{mol.inchi}</code>
            </div>
          </div>
        )}

        {/* InChIKey */}
        {mol.inchiKey && (
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.06em" }}>InChIKey</span>
            <div style={{ marginTop: "0.15rem", padding: "0.3rem 0.5rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
              <code style={{ fontSize: "0.78rem", color: "#495057", background: "none", display: "block", fontFamily: "monospace" }}>{mol.inchiKey}</code>
            </div>
          </div>
        )}
      </div>

      {/* Properties panel */}
      <div style={{
        flexShrink: 0, width: "155px",
        borderLeft: "1px solid #dee2e6",
        padding: "0.85rem 0.9rem",
        backgroundColor: "#fafafa",
      }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
          Properties
        </div>
        {molProps === null ? (
          <span style={{ color: "#adb5bd", fontSize: "0.78rem" }}>Loading…</span>
        ) : PROPS_LIST.some(k => molProps[k] != null) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {PROPS_LIST.filter(k => molProps[k] != null).map(k => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.74rem", color: "#6c757d" }}>{PROPS_LABELS[k]}</span>
                <strong style={{ fontSize: "0.78rem", color: "#212529" }}>
                  {typeof molProps[k] === 'number' ? molProps[k].toFixed(2) : String(molProps[k])}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ color: "#adb5bd", fontSize: "0.78rem" }}>—</span>
        )}
      </div>
    </div>
  );
}

function MoleculeTable({ molecules, apiUrls }) {
  const compoundsRoot = apiUrls?.compoundsRoot
    ? String(apiUrls.compoundsRoot).replace(/\/?$/, '/')
    : null;
  return (
    <div>
      {molecules.map((mol, idx) => (
        <MoleculeRow key={mol.id || idx} mol={mol} compoundsRoot={compoundsRoot} />
      ))}
    </div>
  );
}

// ── MolsetExportPanel: SDF export with auto-polling until file is ready ───────
function MolsetExportPanel({ molset, apiUrls }) {
  const [exports, setExports] = React.useState([]);
  const [exporters, setExporters] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [formName, setFormName] = React.useState(`${molset.name} – SDF Export`);
  const [selectedExporter, setSelectedExporter] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const pollRef = React.useRef(null);

  const compoundSetsRoot = String(apiUrls?.compoundSetsRoot || '/api/compounds/sets/').replace(/\/?$/, '/');

  const loadExports = React.useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return fetch(`${compoundSetsRoot}all/${molset.id}/exports/`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setLoading(false);
        setExports(list);
        return list;
      })
      .catch(() => { setLoading(false); return []; });
  }, [compoundSetsRoot, molset.id]);

  const startPolling = React.useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      loadExports(true).then(list => {
        const anyPending = list.some(exp => !exp.files || exp.files.length === 0);
        if (!anyPending) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      });
    }, 3000);
  }, [loadExports]);

  React.useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  React.useEffect(() => {
    fetch(`${compoundSetsRoot}exporters/`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setExporters(list);
        if (list.length > 0) setSelectedExporter(list[0].id);
      })
      .catch(() => {});
    loadExports().then(list => {
      if (list.some(exp => !exp.files || exp.files.length === 0)) startPolling();
    });
  }, [molset.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setFormName(`${molset.name} – SDF Export`);
  }, [molset.id, molset.name]);

  const handleCreate = async () => {
    if (!selectedExporter) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`${compoundSetsRoot}all/${molset.id}/exports/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: `SDF export from ${molset.name}`, exporter: selectedExporter }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || data.error || JSON.stringify(data));
      setShowForm(false);
      await loadExports();
      startPolling();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exp) => {
    if (!window.confirm(`Delete export "${exp.name}"?`)) return;
    await fetch(`${compoundSetsRoot}all/${molset.id}/exports/${exp.id}/`, { method: 'DELETE', credentials: 'include' });
    loadExports();
  };

  const anyPending = exports.some(exp => !exp.files || exp.files.length === 0);

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid #e9ecef", paddingTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#212529" }}>📥 SDF Export</span>
        {anyPending && (
          <span style={{
            fontSize: "0.78rem", color: "#856404",
            backgroundColor: "#fff3cd", padding: "0.15rem 0.6rem",
            borderRadius: "12px", border: "1px solid #ffc107",
          }}>
            ⏳ Generating…
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
          {!showForm && (
            <Button size="sm" color="primary" onClick={() => setShowForm(true)}>+ New Export</Button>
          )}
          <Button size="sm" color="outline-secondary" onClick={() => loadExports()}>↻</Button>
        </div>
      </div>

      {error && <Alert color="danger" toggle={() => setError(null)} style={{ fontSize: "0.85rem" }}>{error}</Alert>}

      {showForm && (
        <div style={{
          display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end",
          marginBottom: "0.75rem", padding: "0.85rem 1rem",
          backgroundColor: "#f8f9fa", borderRadius: "6px",
          border: "1px solid #dee2e6",
        }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>Export Name</label>
            <input className="form-control form-control-sm" style={{ width: "230px" }}
              value={formName} onChange={e => setFormName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>Format</label>
            <select className="form-control form-control-sm" style={{ width: "130px" }}
              value={selectedExporter || ""}
              onChange={e => setSelectedExporter(Number(e.target.value))}>
              {exporters.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <Button size="sm" color="success" onClick={handleCreate} disabled={submitting}>
            {submitting ? "Exporting…" : "Export"}
          </Button>
          <Button size="sm" color="outline-secondary" onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      )}

      {loading && <div style={{ color: "#6c757d", fontSize: "0.83rem", padding: "0.5rem 0" }}>Loading…</div>}

      {!loading && exports.length === 0 && !showForm && (
        <p style={{ color: "#adb5bd", fontSize: "0.83rem", margin: 0 }}>No exports yet.</p>
      )}

      {!loading && exports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {exports.map(exp => (
            <div key={exp.id} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.5rem 0.75rem", borderRadius: "6px",
              backgroundColor: "#f8f9fa", border: "1px solid #e9ecef",
              fontSize: "0.85rem",
            }}>
              <span style={{ flex: 1, fontWeight: 500, color: "#212529" }}>{exp.name}</span>
              <span>
                {exp.files && exp.files.length > 0 ? (
                  <a href={exp.files[0].file} download
                    style={{ color: "#0d6efd", fontWeight: 600, textDecoration: "none" }}>
                    ⬇ Download SDF
                  </a>
                ) : (
                  <span style={{ color: "#856404" }}>⏳ Generating…</span>
                )}
              </span>
              <Button size="sm" color="outline-danger" style={{ padding: "0.15rem 0.5rem", lineHeight: 1 }}
                onClick={() => handleDelete(exp)}>✕</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ── SmilesImage: renders a molecule structure using SmilesDrawer (canvas) ───
function SmilesImage({ smiles, size = 200 }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    if (!smiles || !canvasRef.current) return;
    const canvas = canvasRef.current;
    if (window.SmilesDrawer) {
      try {
        const drawer = new window.SmilesDrawer.Drawer({
          width: size, height: size,
          bondThickness: 1.4, fontSizeLarge: 9, fontSizeSmall: 6,
        });
        window.SmilesDrawer.parse(smiles,
          tree => drawer.draw(tree, canvas, 'light', false),
          () => {}
        );
      } catch (e) { /* ignore draw errors */ }
    } else {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, size, size);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText('no drawer', 4, size / 2);
      }
    }
  }, [smiles, size]);

  return (
    <canvas ref={canvasRef} width={size} height={size} title={smiles}
      style={{ display: "block", borderRadius: "4px", background: "#fff", border: "1px solid #dee2e6" }}
    />
  );
}

// Reusable multi-select for scoring components
function ScorerMultiSelect({ label, items, selected, onChange, color }) {
  const toggleItem = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ marginBottom: "0.5rem" }}>
        <strong style={{ fontSize: "0.85rem" }}>{label}:</strong>{' '}
        <span style={{ color: "#6c757d", fontSize: "0.85rem" }}>None available</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <strong style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>{label}:</strong>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
        {items.map(item => {
          const isSelected = selected.includes(item.id);
          return (
            <button key={item.id} type="button" onClick={() => toggleItem(item.id)}
              style={{
                padding: "0.25rem 0.6rem", borderRadius: "4px",
                border: `2px solid ${color}`,
                backgroundColor: isSelected ? color : "white",
                color: isSelected ? "white" : color,
                cursor: "pointer", fontSize: "0.8rem",
                fontWeight: isSelected ? "600" : "400",
                transition: "all 0.15s"
              }}>
              {item.name || `ID ${item.id}`}
              {item.property_name && ` (${item.property_name})`}
            </button>
          );
        })}
      </div>
    </div>
  );
}



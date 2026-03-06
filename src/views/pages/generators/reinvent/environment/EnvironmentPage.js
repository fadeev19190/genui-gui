import React from "react";
import { ComponentWithResources } from '../../../../../genui';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  FormGroup,
  Input,
  Label,
  PopoverBody,
  PopoverHeader,
  UncontrolledPopover,
} from 'reactstrap';
import Form from '@rjsf/bootstrap-4';

// ─── HelpButton ──────────────────────────────────────────────────────────────
let _helpCounter = 0;
function HelpButton({ title, children }) {
  const [id] = React.useState(() => `help-btn-${++_helpCounter}`);
  return (
    <>
      <button
        id={id}
        type="button"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "16px", height: "16px", borderRadius: "50%",
          border: "1px solid #6c757d", background: "transparent",
          color: "#6c757d", fontSize: "10px", fontWeight: "bold",
          cursor: "pointer", lineHeight: 1, padding: 0,
          marginLeft: "6px", verticalAlign: "middle", flexShrink: 0,
        }}
      >?</button>
      <UncontrolledPopover trigger="legacy" placement="right" target={id}>
        {title && <PopoverHeader>{title}</PopoverHeader>}
        <PopoverBody style={{ fontSize: "0.85rem", maxWidth: "280px" }}>{children}</PopoverBody>
      </UncontrolledPopover>
    </>
  );
}

// ─── inline diversity filter sub-form ────────────────────────────────────────
function InlineDiversityFilterFields(props) {
  const { filterConfig, onChange, types } = props;

  const filterTypeHelp = {
    ScaffoldSimilarity: "Compares the Bemis–Murcko scaffold of newly generated molecules against those already seen. If the scaffold is too similar (above Min Similarity) and the score is high (above Min Score), the molecule is penalised. Best for encouraging scaffold diversity.",
    IdenticalMurckoScaffold: "Penalises molecules that share an identical (not just similar) Bemis–Murcko scaffold with a recently generated molecule. Stricter than ScaffoldSimilarity — good when you want no scaffold repeats at all.",
    IdenticalTopologicalScaffold: "Uses the topological (ring-system) scaffold instead of Bemis–Murcko. Penalises molecules with an identical topological scaffold that were seen within the bucket window.",
    PenalizeSameSmiles: "Directly penalises exact SMILES repeats rather than scaffold-based similarity. Use this when you want to avoid identical molecules but still allow structurally similar ones.",
    NoFilter: "Disables diversity filtering entirely. All generated molecules are scored normally regardless of similarity to previous ones.",
  };

  const defaultHelp = "Penalises molecules that are too similar to recently generated ones, encouraging structural diversity.";

  return (
    <div style={{
      padding: "1rem",
      backgroundColor: "#fff3cd",
      border: "1px solid #ffc107",
      borderRadius: "6px",
      marginTop: "0.75rem"
    }}>
      <h6 style={{ marginTop: 0, color: "#856404" }}>⚙️ Diversity Filter Settings</h6>
      <FormGroup>
        <Label style={{ display: "flex", alignItems: "center" }}>
          Filter Type
          <HelpButton title="Filter Type">
            {filterTypeHelp[filterConfig.type] || defaultHelp}
          </HelpButton>
        </Label>
        <Input type="select" value={filterConfig.type} onChange={e => onChange({ ...filterConfig, type: e.target.value })}>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </Input>
      </FormGroup>
      <FormGroup>
        <Label style={{ display: "flex", alignItems: "center" }}>
          Bucket Size
          <HelpButton title="Bucket Size">
            The number of most-recently generated molecules kept in the memory window. The diversity filter compares each new molecule only against this sliding window. Larger buckets mean longer memory but slower scoring. Default: 25.
          </HelpButton>
        </Label>
        <Input type="number" value={filterConfig.bucket_size} min={1}
          onChange={e => onChange({ ...filterConfig, bucket_size: Number(e.target.value) })} />
      </FormGroup>
      <FormGroup>
        <Label style={{ display: "flex", alignItems: "center" }}>
          Minimum Score
          <HelpButton title="Minimum Score">
            Only molecules whose raw score is <em>above</em> this threshold are eligible for diversity penalisation. Molecules with a score below this value are always passed through unchanged. Default: 0.4.
          </HelpButton>
        </Label>
        <Input type="number" value={filterConfig.minscore} step={0.05} min={0} max={1}
          onChange={e => onChange({ ...filterConfig, minscore: Number(e.target.value) })} />
      </FormGroup>
      <FormGroup>
        <Label style={{ display: "flex", alignItems: "center" }}>
          Minimum Similarity
          <HelpButton title="Minimum Similarity">
            Tanimoto (or scaffold) similarity threshold. If a new molecule is more similar than this value to any molecule in the bucket, it is considered a near-duplicate and its score is penalised. Default: 0.4.
          </HelpButton>
        </Label>
        <Input type="number" value={filterConfig.minsimilarity} step={0.05} min={0} max={1}
          onChange={e => onChange({ ...filterConfig, minsimilarity: Number(e.target.value) })} />
      </FormGroup>
      {filterConfig.type === "PenalizeSameSmiles" && (
        <FormGroup>
          <Label style={{ display: "flex", alignItems: "center" }}>
            Penalty Multiplier
            <HelpButton title="Penalty Multiplier">
              Factor by which the score is multiplied when a near-duplicate is detected. A value of 0.5 halves the score; 0.0 zeroes it entirely. Only applies to the <em>PenalizeSameSmiles</em> filter type. Default: 0.5.
            </HelpButton>
          </Label>
          <Input type="number" value={filterConfig.penalty_multiplier} step={0.05} min={0} max={1}
            onChange={e => onChange({ ...filterConfig, penalty_multiplier: Number(e.target.value) })} />
        </FormGroup>
      )}
    </div>
  );
}

// ─── EnvCreatorForm ───────────────────────────────────────────────────────────
function EnvCreatorForm(props) {
  const { applyFilter, filterConfig } = props;
  const hasNetworks = props.networks.length > 0;

  if (!hasNetworks) {
    return <div className="alert alert-warning">No trained networks available. Please train a ReinventNet model first in the Model Designer tab.</div>;
  }

  const schema = {
    type: "object",
    required: ["name", "prior_net", "agent_net"],
    properties: {
      name: { type: "string", title: "Name", minLength: 1, default: "" },
      description: { type: "string", title: "Description", default: "" },
      prior_net: { type: "integer", title: "Prior Network" },
      agent_net: { type: "integer", title: "Agent Network" },
    }
  };

  const itemsMap = { prior_net: props.networks, agent_net: props.networks };

  const ItemField = (fieldProps) => {
    const fieldName = fieldProps.id.replace('root_', '');
    const items = itemsMap[fieldName] || [];

    const helpContent = {
      prior_net: {
        title: "Prior Network",
        body: "The frozen reference network produced by Transfer Learning. It defines the chemical language model that generates baseline molecules. The agent is penalised when it drifts too far from this prior, keeping generated molecules drug-like. Usually you pick the best TL-trained network for your target chemical space."
      },
      agent_net: {
        title: "Agent Network",
        body: "A copy of the prior network whose weights are updated during reinforcement learning. It learns to generate molecules with higher scores according to your reward scheme. In most experiments you select the same network as the Prior — a fresh copy is made automatically at the start of each run."
      },
    };
    const help = helpContent[fieldName];

    return (
      <FormGroup>
        <Label style={{ display: "flex", alignItems: "center" }}>
          {fieldProps.schema.title}
          {fieldProps.required && <span style={{ color: "#dc3545", marginLeft: "3px" }}>*</span>}
          {help && <HelpButton title={help.title}>{help.body}</HelpButton>}
        </Label>
        <Input type="select" id={fieldProps.id} value={fieldProps.value || ""} required={fieldProps.required}
          onChange={e => fieldProps.onChange(e.target.value === "" ? undefined : e.target.value)}>
          <option value="">---</option>
          {items.map(item => (
            <option key={item.id} value={item.id}>
              {item.name || `ID: ${item.id}`}
            </option>
          ))}
        </Input>
      </FormGroup>
    );
  };

  const uiSchemaSelects = {
    description: { "ui:widget": "textarea" },
    prior_net: { "ui:widget": ItemField },
    agent_net: { "ui:widget": ItemField },
  };

  return (
    <Form
      uiSchema={uiSchemaSelects}
      showErrorList={true}
      schema={schema}
      onError={errors => {
        console.error("Form validation errors:", errors);
        alert("Form validation failed. Check console for details.");
      }}
      onSubmit={async data => {
        const payload = { ...data.formData };

        if (!props.onAdd) {
          alert("Error: onAdd function is missing");
          return;
        }

        payload.project = props.currentProject.id;
        payload.prior_net = payload.prior_net ? Number(payload.prior_net) : null;
        payload.agent_net = payload.agent_net ? Number(payload.agent_net) : null;
        payload.prior_model = null;
        payload.agent_model = null;
        payload.diversity_filter = null;

        if (applyFilter) {
          try {
            const dfUrl = new URL('diversity-filters/', props.apiUrls.reinventRoot).toString();
            const dfResp = await fetch(dfUrl, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(filterConfig),
            });
            if (!dfResp.ok) {
              const err = await dfResp.json().catch(() => ({}));
              alert('Failed to create Diversity Filter:\n\n' + JSON.stringify(err, null, 2));
              return;
            }
            const df = await dfResp.json();
            payload.diversity_filter = df.id;
          } catch (err) {
            alert('Error creating Diversity Filter: ' + err.message);
            return;
          }
        }

        const result = props.onAdd(props.title, payload);
        if (result && typeof result.then === 'function') {
          result.catch(error => {
            alert(`Failed to create environment: ${error.message || JSON.stringify(error)}`);
          });
        }
      }}
    >
      <div style={{ marginTop: "1.5rem" }}>
        <Button type="submit" color="success" size="lg" style={{ fontWeight: "600", fontSize: "1.1rem" }}>
          ➕ Create Environment
        </Button>
      </div>
    </Form>
  );
}

// ─── EnvCreatorContent ────────────────────────────────────────────────────────
function EnvCreatorContent(props) {
  const defaultFilter = { type: (props.filterTypes && props.filterTypes[0]) || "ScaffoldSimilarity", bucket_size: 25, minscore: 0.4, minsimilarity: 0.4, penalty_multiplier: 0.5 };
  const [applyFilter, setApplyFilter] = React.useState(false);
  const [filterConfig, setFilterConfig] = React.useState(defaultFilter);

  return (
    <React.Fragment>
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Create New Environment</h3>
        <p style={{ color: "#6c757d", marginBottom: "1rem" }}>
          Define the models and reward scheme for reinforcement learning. Click <strong>?</strong> next to any field for details.
        </p>
      </div>

      {/* Diversity Filter — shown at top so toggling it doesn't reset the form below */}
      <div style={{
        marginBottom: "1.5rem",
        padding: "1rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
        border: "1px solid #dee2e6"
      }}>
        <FormGroup check style={{ marginBottom: applyFilter ? "0.5rem" : 0 }}>
          <Label check style={{ display: "flex", alignItems: "center" }}>
            <Input type="checkbox" checked={applyFilter} onChange={e => setApplyFilter(e.target.checked)} />
            <span style={{ marginLeft: "0.4rem" }}>⚙️ Apply Diversity Filter</span>
            <HelpButton title="Diversity Filter">
              A diversity filter tracks recently generated molecules and penalises new ones that are too similar to them. This prevents the agent from getting stuck generating minor variations of the same scaffold.<br /><br />
              When enabled, a new filter record is created and linked to the environment. You can configure the filter type and thresholds below.
            </HelpButton>
          </Label>
        </FormGroup>
        {applyFilter && (
          <InlineDiversityFilterFields
            filterConfig={filterConfig}
            onChange={setFilterConfig}
            types={props.filterTypes}
          />
        )}
      </div>

      <EnvCreatorForm
        {...props}
        networks={props.networks}
        filterTypes={props.filterTypes}
        applyFilter={applyFilter}
        setApplyFilter={setApplyFilter}
        filterConfig={filterConfig}
        setFilterConfig={setFilterConfig}
        title="Environments"
      />
    </React.Fragment>
  );
}

// ─── EnvCreator ───────────────────────────────────────────────────────────────
function EnvCreator(props) {
  // Track a refresh key that increments when the component detects new data
  const [refreshKey, setRefreshKey] = React.useState(0);
  const containerRef = React.useRef(null);

  // Re-fetch networks whenever this component becomes visible (tab switch)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRefreshKey(k => k + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
    <ComponentWithResources
      key={`env-creator-${refreshKey}`}
      definition={{
        networks: new URL(`networks/?project_id=${props.currentProject.id}`, props.apiUrls.reinventRoot),
        filterTypesData: new URL('diversity-filters/available-types/', props.apiUrls.reinventRoot),
      }}
    >
      {(isLoaded, data) => {
        if (!isLoaded) return <div>Loading resources...</div>;
        const filterTypes = (data.filterTypesData?.types?.length > 0)
          ? data.filterTypesData.types
          : ["ScaffoldSimilarity"];
        return (
          <EnvCreatorContent
            {...props}
            networks={data.networks || []}
            filterTypes={filterTypes}
          />
        );
      }}
    </ComponentWithResources>
    </div>
  );
}

// ─── EnvCard ──────────────────────────────────────────────────────────────────
function EnvCard(props) {
  const env = props.environment;
  const df = env.diversity_filter_detail;

  const row = (label, value) => (
    <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", padding: "0.4rem 0" }}>
      <span style={{ width: "45%", color: "#6c757d", fontSize: "0.875rem", fontWeight: 500 }}>{label}</span>
      <span style={{ width: "55%", fontSize: "0.875rem", wordBreak: "break-all" }}>{value ?? <em style={{ color: "#adb5bd" }}>—</em>}</span>
    </div>
  );


  const fmt = (dt) => dt ? new Date(dt).toLocaleString() : "—";

  return (
    <Card style={{ width: "calc(50% - 0.5rem)", minWidth: "280px", display: "inline-flex", flexDirection: "column" }}>
      <CardHeader style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #28a745" }}>
        <strong style={{ fontSize: "1rem" }}>{env.name}</strong>
        {env.description && <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "0.25rem" }}>{env.description}</div>}
      </CardHeader>
      <CardBody style={{ padding: "1rem" }}>
        {/* Timestamps */}
        <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", backgroundColor: "#f8f9fa", borderRadius: "4px", fontSize: "0.8rem", color: "#6c757d" }}>
          <span>Created: {fmt(env.created)}</span>
          <span style={{ marginLeft: "1rem" }}>Updated: {fmt(env.updated)}</span>
        </div>

        {/* Networks */}
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "#495057", marginBottom: "0.25rem", letterSpacing: "0.05em" }}>Networks</div>
          {row("Prior Network", env.prior_net_name || (env.prior_net ? `ID: ${env.prior_net}` : null))}
          {row("Agent Network", env.agent_net_name || (env.agent_net ? `ID: ${env.agent_net}` : null))}
        </div>


        {/* Diversity Filter */}
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "#495057", marginBottom: "0.25rem", letterSpacing: "0.05em" }}>Diversity Filter</div>
          {df ? (
            <div style={{ padding: "0.6rem 0.75rem", backgroundColor: "#fff8e1", border: "1px solid #ffe082", borderRadius: "4px" }}>
              {row("Type", df.type)}
              {row("Bucket Size", df.bucket_size)}
              {row("Min Score", df.minscore)}
              {row("Min Similarity", df.minsimilarity)}
              {df.type === "PenalizeSameSmiles" && row("Penalty Multiplier", df.penalty_multiplier)}
            </div>
          ) : (
            <div style={{ fontSize: "0.875rem", color: "#adb5bd", fontStyle: "italic" }}>None</div>
          )}
        </div>
      </CardBody>
      <CardFooter style={{ backgroundColor: "#f8f9fa", textAlign: "right" }}>
        <Button color="danger" size="sm" onClick={() => props.onDelete(env)}>🗑 Delete</Button>
      </CardFooter>
    </Card>
  );
}

// ─── Envs ─────────────────────────────────────────────────────────────────────
function Envs(props) {
  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>Environment Creator</h1>
        <div style={{ padding: "1.5rem", backgroundColor: "#e7f3ff", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
          <h5 style={{ marginTop: 0, color: "#004085" }}>📋 About Environments</h5>
          <p style={{ marginBottom: 0 }}>
            Environments connect your trained models with reward schemes to enable reinforcement learning.
            You need an environment before creating agents and running staged learning experiments.
          </p>
        </div>
      </div>

      {props.environments && props.environments.length > 0 && (
        <div style={{ marginBottom: "3rem" }}>
          <h3 style={{ marginBottom: "1.5rem", paddingBottom: "0.5rem", borderBottom: "2px solid #28a745" }}>
            📦 Your Environments ({props.environments.length})
          </h3>
          <div className="environment-list" style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {props.environments.map(item => (
              <EnvCard
                {...props}
                key={item.id}
                environment={item}
                onDelete={(item) => props.onDelete(props.title, item)}
              />
            ))}
          </div>
          <hr style={{ margin: "3rem 0" }}/>
        </div>
      )}

      <div className="environment-creator" style={{
        padding: "2rem",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #dee2e6"
      }}>
        <EnvCreator {...props}/>
      </div>
    </div>
  );
}

// ─── EnvironmentPage (exported) ───────────────────────────────────────────────
export default function EnvironmentPage(props) {
  const [environments, setEnvironments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const apiUrlStr = React.useMemo(
    () => new URL('environments/', props.apiUrls.reinventRoot).toString(),
    [props.apiUrls.reinventRoot]
  );

  const fetchEnvironments = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('project_id', props.currentProject.id);
    fetch(apiUrlStr + '?' + params.toString(), { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setEnvironments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { console.error('Failed to fetch environments:', err); setLoading(false); });
  }, [props.currentProject.id, apiUrlStr]);

  React.useEffect(() => { fetchEnvironments(); }, [fetchEnvironments]);

  const handleAdd = (_className, payload) => {
    fetch(apiUrlStr, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            alert('Failed to create Environment:\n\n' + JSON.stringify(err, null, 2));
            throw new Error('create failed');
          });
        }
        return response.json();
      })
      .then(created => { setEnvironments(prev => [created, ...prev]); })
      .catch(err => console.error('handleAdd error:', err));
  };

  const handleDelete = (_className, item) => {
    const confirmed = window.confirm(
      `⚠️ Delete environment "${item.name}"?\n\n` +
      `This will permanently delete:\n` +
      `  • The environment itself\n` +
      `  • All agents linked to this environment\n` +
      `  • All staged learning runs using this environment\n\n` +
      `This action cannot be undone. Are you sure?`
    );
    if (!confirmed) return;

    fetch(apiUrlStr + item.id + '/', { method: 'DELETE', credentials: 'include' })
      .then(response => {
        if (response.ok || response.status === 204) {
          setEnvironments(prev => prev.filter(e => e.id !== item.id));
          if (typeof props.triggerDataRefresh === 'function') {
            props.triggerDataRefresh('runs');
          }
        } else {
          return response.json().then(err => {
            const msg = err && (err.detail || JSON.stringify(err));
            alert(`Could not delete environment "${item.name}":\n\n${msg}`);
          }).catch(() => {
            alert(`Could not delete environment "${item.name}" (HTTP ${response.status}).`);
          });
        }
      })
      .catch(err => { console.error('handleDelete error:', err); alert(`Could not delete environment: ${err.message}`); });
  };

  if (loading) return <div style={{ padding: '2rem' }}>⏳ Loading environments...</div>;

  return (
    <Envs
      {...props}
      title="Environments"
      environments={environments}
      onAdd={handleAdd}
      onDelete={handleDelete}
    />
  );
}
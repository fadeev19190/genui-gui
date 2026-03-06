import React from 'react';
import { Button, FormGroup, Input, Label, Card, CardBody, CardTitle, CardText, Badge } from 'reactstrap';
import HelpButton from './HelpButton';
import TransformSelector from './TransformSelector';
import TransformGraph from './TransformGraph';

// REINVENT 4 scoring functions — curated list of commonly used components.
// Names must match the exact case of the registered REINVENT 4 component names.
const REINVENT_PROPERTIES = [
  // ── RDKit molecular properties ──────────────────────────────
  { value: "Qed", label: "QED — Drug-likeness score (0–1)" },
  { value: "SlogP", label: "SlogP — Crippen cLogP lipophilicity" },
  { value: "MolecularWeight", label: "MolecularWeight — Molecular weight" },
  { value: "TPSA", label: "TPSA — Topological polar surface area" },
  { value: "HBondAcceptors", label: "HBondAcceptors — H-bond acceptors" },
  { value: "HBondDonors", label: "HBondDonors — H-bond donors" },
  { value: "NumRotBond", label: "NumRotBond — Rotatable bonds" },
  { value: "Csp3", label: "Csp3 — Fraction of sp3 carbons" },
  // ── Atom counts ─────────────────────────────────────────────
  { value: "NumHeavyAtoms", label: "NumHeavyAtoms — Number of heavy atoms" },
  { value: "NumHeteroAtoms", label: "NumHeteroAtoms — Number of heteroatoms (N, O, S, …)" },
  // ── Ring counts ─────────────────────────────────────────────
  { value: "NumRings", label: "NumRings — Total rings" },
  { value: "NumAromaticRings", label: "NumAromaticRings — Aromatic rings" },
  { value: "NumAliphaticRings", label: "NumAliphaticRings — Aliphatic rings" },
  { value: "LargestRingSize", label: "LargestRingSize — Largest ring size" },
  // ── Complexity / stereo ─────────────────────────────────────
  { value: "NumAtomSteroCenters", label: "NumAtomSteroCenters — Stereocenters" },
  // ── Synthesizability ────────────────────────────────────────
  { value: "SAScore", label: "SAScore — Synthetic accessibility (1–10)" },
  // ── SMARTS-based ────────────────────────────────────────────
  { value: "MatchingSubstructure", label: "MatchingSubstructure — SMARTS substructure match" },
  { value: "GroupCount", label: "GroupCount — Count SMARTS pattern matches" },
  // ── Diversity / novelty ─────────────────────────────────────
  { value: "TanimotoDistance", label: "TanimotoDistance — Tanimoto distance (Morgan FP)" },
];

// Components that require endpoint-level params.
const COMPONENTS_WITH_PARAMS = {
  TanimotoDistance: {
    smiles: { type: "string", title: "Reference SMILES (comma-separated)", default: "c1ccccc1" },
    radius: { type: "integer", title: "Fingerprint Radius", default: 3 },
    use_counts: { type: "boolean", title: "Use Counts", default: true },
    use_features: { type: "boolean", title: "Use Features", default: false },
  },
  GroupCount: {
    smarts: { type: "string", title: "SMARTS Pattern", default: "[#6]" },
  },
  MatchingSubstructure: {
    smarts: { type: "string", title: "SMARTS Pattern", default: "[#6]" },
    use_chirality: { type: "boolean", title: "Use Chirality", default: false },
  },
};

// =====================================================================
// Property Scorer Form
// =====================================================================
function PropertyScorerForm({ onAdd, apiUrls }) {
  const [name, setName] = React.useState('');
  const [weight, setWeight] = React.useState(1.0);
  const [propertyName, setPropertyName] = React.useState('');
  const [componentParams, setComponentParams] = React.useState({});
  const [transformParams, setTransformParams] = React.useState(null);

  const handlePropertyChange = (val) => {
    setPropertyName(val);
    setTransformParams(null);
    const paramDefs = COMPONENTS_WITH_PARAMS[val];
    if (paramDefs) {
      const defaults = {};
      for (const [key, def] of Object.entries(paramDefs)) defaults[key] = def.default;
      setComponentParams(defaults);
    } else {
      setComponentParams({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert("Name is required!"); return; }
    if (!propertyName) { alert("Property is required!"); return; }

    const payload = { name: name.trim(), weight: Number(weight), property_name: propertyName };

    const paramDefs = COMPONENTS_WITH_PARAMS[propertyName];
    if (paramDefs) {
      const params = { ...componentParams };
      if (params.smiles && typeof params.smiles === 'string') {
        params.smiles = params.smiles.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      payload.component_params = params;
    }

    payload.transform_params = transformParams || null;
    await onAdd('PropertyScorers', payload);
    setName(''); setWeight(1.0); setPropertyName(''); setComponentParams({}); setTransformParams(null);
  };

  const paramDefs = COMPONENTS_WITH_PARAMS[propertyName];

  return (
    <form onSubmit={handleSubmit}>
      <FormGroup>
        <Label style={{ fontWeight: "600" }}>
          Property (Required)
          <HelpButton title="Molecular Property">
            REINVENT 4 scoring component computed for each generated molecule.
          </HelpButton>
        </Label>
        <Input type="select" value={propertyName} onChange={e => handlePropertyChange(e.target.value)} required>
          <option value="">-- Select a property --</option>
          {REINVENT_PROPERTIES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Input>
      </FormGroup>

      <FormGroup>
        <Label style={{ fontWeight: "600" }}>
          Name (Required)
          <HelpButton title="Name">A label for this scorer (e.g. "QED_high", "LogP_2to4").</HelpButton>
        </Label>
        <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. QED_scorer" required />
      </FormGroup>

      <FormGroup>
        <Label style={{ fontWeight: "600" }}>
          Weight
          <HelpButton title="Weight">Relative importance when combining scorers. Default 1.0.</HelpButton>
        </Label>
        <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
      </FormGroup>

      {/* Component-specific parameters */}
      {paramDefs && (
        <div style={{ margin: "1rem 0", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "6px", border: "1px solid #ffc107" }}>
          <strong style={{ display: "block", marginBottom: "0.75rem", color: "#856404" }}>
            ⚙️ Parameters for {propertyName}
          </strong>
          {Object.entries(paramDefs).map(([key, def]) => (
            <FormGroup key={key} style={{ marginBottom: "0.5rem" }}>
              <Label style={{ fontSize: "0.9rem", fontWeight: "500" }}>{def.title}</Label>
              {def.type === "boolean" ? (
                <Input type="select"
                  value={componentParams[key] !== undefined ? String(componentParams[key]) : String(def.default)}
                  onChange={e => setComponentParams(prev => ({ ...prev, [key]: e.target.value === "true" }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Input>
              ) : def.type === "integer" ? (
                <Input type="number"
                  value={componentParams[key] !== undefined ? componentParams[key] : def.default}
                  onChange={e => setComponentParams(prev => ({ ...prev, [key]: Number(e.target.value) }))} />
              ) : (
                <Input type="text"
                  value={componentParams[key] !== undefined ? componentParams[key] : def.default}
                  onChange={e => setComponentParams(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={String(def.default)} />
              )}
            </FormGroup>
          ))}
        </div>
      )}

      {/* Transform selector with live graph preview */}
      {propertyName && (
        <TransformSelector
          apiBase={apiUrls?.reinventRoot}
          propertyName={propertyName}
          value={transformParams}
          onChange={setTransformParams}
        />
      )}

      <Button type="submit" color="primary" size="lg" style={{ marginTop: "1rem", fontSize: "1.1rem", fontWeight: "600" }}>
        ➕ Create Property Scorer
      </Button>
    </form>
  );
}

// =====================================================================
// Bad SMARTS Weight Slider — always-on, user only adjusts weight
// =====================================================================
function BadSmartsWeightControl({ value, onChange }) {
  return (
    <div style={{ margin: "1.5rem 0", padding: "1rem", backgroundColor: "#fff8e1", borderRadius: "8px", border: "1px solid #ffcc80" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "0.75rem" }}>
        <strong style={{ fontSize: "1rem", color: "#e65100" }}>
          🛡️ Bad SMARTS Penalty (always enabled)
        </strong>
        <HelpButton title="Bad SMARTS Penalty">
          A built-in filter that penalises molecules containing unwanted reactive or toxic
          substructures (peroxides, large rings, positively charged carbons, etc.).
          This component is <strong>always included</strong> in every training stage.<br /><br />
          Adjust the weight to control how strongly it influences the reward:
          <ul>
            <li><strong>1.0</strong> — full penalty (recommended)</li>
            <li><strong>0.5</strong> — moderate penalty</li>
            <li><strong>0.0</strong> — effectively disabled</li>
          </ul>
        </HelpButton>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <input
          type="range" min="0" max="1" step="0.05"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, cursor: "pointer" }}
        />
        <span style={{
          minWidth: "3rem", textAlign: "center", fontWeight: "700", fontSize: "1.1rem",
          color: value < 0.3 ? "#dc3545" : value < 0.7 ? "#ffc107" : "#28a745"
        }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#999", marginTop: "0.25rem" }}>
        <span>0 (disabled)</span>
        <span>1 (full penalty)</span>
      </div>
    </div>
  );
}

// =====================================================================
// Scorer Card — shows transform graph inline
// =====================================================================
function ScorerCard({ item, onDelete, apiUrls }) {
  const [graphData, setGraphData] = React.useState(null);
  const [expanded, setExpanded] = React.useState(false);

  const effectiveTransform = item.transform_params || item.effective_transform || null;
  const transformType = effectiveTransform ? effectiveTransform.type : null;
  const isAutoDefault = !item.transform_params && !!item.effective_transform;

  // Fetch graph data when card is expanded
  React.useEffect(() => {
    if (!expanded || !effectiveTransform || !apiUrls) return;
    let cancelled = false;

    const PROPERTY_X_RANGES = {
      Qed:[0,1], SlogP:[-3,8], MolecularWeight:[0,800], TPSA:[0,250],
      HBondAcceptors:[0,15], HBondDonors:[0,10], NumRotBond:[0,20], Csp3:[0,1],
      NumHeavyAtoms:[0,60], NumHeteroAtoms:[0,12],
      NumRings:[0,8], NumAromaticRings:[0,6], NumAliphaticRings:[0,6], LargestRingSize:[0,12],
      NumAtomSteroCenters:[0,8],
      SAScore:[1,10], TanimotoSimilarity:[0,1], TanimotoDistance:[0,1],
      MatchingSubstructure:[0,1], GroupCount:[0,8],
    };
    const xRange = PROPERTY_X_RANGES[item.property_name] || [0, 1];

    fetch(new URL('property-scorers/preview-transform/', apiUrls.reinventRoot).toString(), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transform: effectiveTransform, x_min: xRange[0], x_max: xRange[1], n_points: 200 }),
    })
      .then(r => r.json())
      .then(data => { if (!cancelled && data.x) setGraphData(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [expanded, effectiveTransform, apiUrls, item.property_name]);

  const TRANSFORM_COLORS = {
    sigmoid: '#007bff', reverse_sigmoid: '#dc3545', double_sigmoid: '#28a745',
    right_step: '#6f42c1', left_step: '#fd7e14', step: '#20c997', exponential_decay: '#e83e8c',
  };
  const graphColor = TRANSFORM_COLORS[transformType] || '#007bff';

  return (
    <Card style={{ marginBottom: "1rem", borderLeft: `4px solid ${graphColor}` }}>
      <CardBody>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <CardTitle tag="h5" style={{ marginBottom: '0.35rem' }}>🎯 {item.name}</CardTitle>
            <CardText style={{ marginBottom: '0.35rem' }}>
              <div><strong>Property:</strong> {item.property_name}</div>
              <div><strong>Weight:</strong> {item.weight}</div>
              {item.component_params && (
                <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                  <strong>Params:</strong> {JSON.stringify(item.component_params)}
                </div>
              )}
            </CardText>

            {/* Transform badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {transformType ? (
                <Badge style={{ backgroundColor: graphColor, fontSize: '0.75rem' }}>
                  📈 {transformType.replace(/_/g, ' ')}
                </Badge>
              ) : (
                <Badge color="secondary" style={{ fontSize: '0.75rem' }}>📈 no transform</Badge>
              )}
              {isAutoDefault && (
                <Badge color="light" style={{ fontSize: '0.7rem', border: '1px solid #dee2e6', color: '#6c757d' }}>
                  auto-default
                </Badge>
              )}
              <Button
                size="sm" color="link"
                style={{ padding: 0, fontSize: '0.78rem' }}
                onClick={() => setExpanded(e => !e)}
              >
                {expanded ? '▲ Hide graph' : '▼ Show graph'}
              </Button>
            </div>
          </div>
          <Button close onClick={() => onDelete(item)} style={{ marginLeft: '0.5rem' }} />
        </div>

        {/* Expanded graph + params */}
        {expanded && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e9ecef' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#6c757d', marginBottom: 4, fontWeight: 600 }}>
                  Transform preview
                </div>
                <TransformGraph
                  xValues={graphData?.x}
                  yValues={graphData?.y}
                  xMin={graphData?.x?.[0] ?? 0}
                  xMax={graphData?.x?.[graphData.x.length - 1] ?? 1}
                  color={graphColor}
                  loading={!graphData && !!effectiveTransform}
                />
              </div>
              {effectiveTransform && (
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: '0.78rem', color: '#6c757d', marginBottom: 6, fontWeight: 600 }}>
                    Parameters
                  </div>
                  {Object.entries(effectiveTransform)
                    .filter(([k]) => k !== 'type')
                    .map(([k, v]) => (
                      <div key={k} style={{ fontSize: '0.82rem', marginBottom: 3 }}>
                        <strong>{k}:</strong> {String(v)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// =====================================================================
// Scorers List
// =====================================================================
function ScorersList({ propertyScorers = [], onDelete, apiUrls }) {
  if (propertyScorers.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "2px dashed #dee2e6" }}>
        <h5 style={{ color: "#6c757d" }}>📊 No Property Scorers Yet</h5>
        <p style={{ color: "#6c757d", marginBottom: 0 }}>
          Create property scorers above to define your optimization objectives
        </p>
      </div>
    );
  }

  return (
    <div>
      <h5 style={{ marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid #007bff" }}>
        🔬 Property Scorers ({propertyScorers.length})
      </h5>
      {propertyScorers.map(item => (
        <ScorerCard key={`property-${item.id}`} item={item} apiUrls={apiUrls} onDelete={() => onDelete('PropertyScorers', item)} />
      ))}
    </div>
  );
}

// =====================================================================
// UnifiedScorersComponent — pure presentational
// =====================================================================
function UnifiedScorersComponent(props) {
  if (!props.currentProject) {
    return <div className="alert alert-warning">Loading project information...</div>;
  }

  const totalCount = props.propertyScorers.length;

  return (
    <React.Fragment>
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ marginBottom: "0.5rem" }}>
          Scoring Components
          {totalCount > 0 && (
            <Badge color="primary" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
              {totalCount} scorer{totalCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </h4>
        <p style={{ color: "#6c757d", marginBottom: 0 }}>
          Define what molecular properties to optimize during molecule generation
        </p>
      </div>

      <BadSmartsWeightControl value={props.badSmartsWeight} onChange={props.onBadSmartsWeightChange} />

      {/* ── Property Scorers ─────────────────────────────────── */}
      <div style={{ marginTop: "1.5rem" }}>
        <h5 style={{ marginBottom: "1rem" }}>➕ Add Property Scorer</h5>
        <PropertyScorerForm onAdd={props.onAdd} apiUrls={props.apiUrls} />
      </div>

      <hr style={{ margin: "2rem 0" }} />

      {/* ── All active scorers ───────────────────────────────── */}
      <h5 style={{ marginBottom: "1.5rem" }}>📊 Your Scoring Components</h5>

      {totalCount === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "2px dashed #dee2e6" }}>
          <h5 style={{ color: "#6c757d" }}>📊 No Scoring Components Yet</h5>
          <p style={{ color: "#6c757d", marginBottom: 0 }}>
            Use the form above to add property scorers.
          </p>
        </div>
      ) : (
        <ScorersList propertyScorers={props.propertyScorers} onDelete={props.onDelete} apiUrls={props.apiUrls} />
      )}
    </React.Fragment>
  );
}

// =====================================================================
// Top-level exported component
// =====================================================================
export default function UnifiedScorers(props) {
  const [propertyScorers, setPropertyScorers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [badSmartsWeight, setBadSmartsWeight] = React.useState(1.0);
  const [confirmDialog, setConfirmDialog] = React.useState({ isOpen: false, endpoint: null, item: null });

  const fetchAll = React.useCallback(async () => {
    if (!props.currentProject) return;
    try {
      setLoading(true);
      const pid = props.currentProject.id;
      const base = props.apiUrls.reinventRoot;
      const res = await fetch(new URL(`property-scorers/?project_id=${pid}`, base), { credentials: 'include' });
      const data = await res.json();
      setPropertyScorers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching scorers:", error);
    } finally {
      setLoading(false);
    }
  }, [props.currentProject, props.apiUrls.reinventRoot]);

  React.useEffect(() => { fetchAll(); }, [fetchAll]);

  React.useEffect(() => {
    const saved = localStorage.getItem('genui_bad_smarts_weight');
    if (saved !== null) setBadSmartsWeight(Number(saved));
  }, []);

  const handleBadSmartsWeightChange = (val) => {
    setBadSmartsWeight(val);
    localStorage.setItem('genui_bad_smarts_weight', String(val));
  };

  const handleAdd = async (endpoint, payload) => {
    if (endpoint !== 'PropertyScorers') return;
    const url = new URL('property-scorers/', props.apiUrls.reinventRoot);
    try {
      const response = await fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to create scorer:\n\n${JSON.stringify(errorData, null, 2)}`);
        return;
      }
      await fetchAll();
      alert("Scorer created successfully!");
    } catch (error) {
      console.error("Error creating scorer:", error);
    }
  };

  const handleDelete = (endpoint, item) => {
    setConfirmDialog({ isOpen: true, endpoint, item });
  };

  const confirmDeleteAction = async () => {
    const { item } = confirmDialog;
    setConfirmDialog({ isOpen: false, endpoint: null, item: null });
    const url = new URL(`property-scorers/${item.id}/`, props.apiUrls.reinventRoot);
    try {
      const response = await fetch(url, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) { alert('Failed to delete scorer'); return; }
      await fetchAll();
    } catch (error) {
      console.error("Error deleting scorer:", error);
    }
  };

  if (loading) return <div>Loading scorers...</div>;

  return (
    <React.Fragment>
      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <Card style={{ width: '400px' }}>
            <CardBody>
              <CardTitle tag="h5">Confirm Delete</CardTitle>
              <CardText>
                Are you sure you want to delete scorer "<strong>{confirmDialog.item?.name}</strong>"?
              </CardText>
              <div>
                <Button color="danger" onClick={confirmDeleteAction} style={{ marginRight: '0.5rem' }}>Delete</Button>
                <Button color="secondary" onClick={() => setConfirmDialog({ isOpen: false, endpoint: null, item: null })}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      <UnifiedScorersComponent
        {...props}
        propertyScorers={propertyScorers}
        badSmartsWeight={badSmartsWeight}
        onBadSmartsWeightChange={handleBadSmartsWeightChange}
        onAdd={handleAdd}
        onDelete={handleDelete}
      />
    </React.Fragment>
  );
}

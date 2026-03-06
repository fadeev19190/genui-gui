/**
 * TransformSelector.js
 *
 * A self-contained panel that lets the user choose a REINVENT4 scoring
 * transform type, edit its parameters, and see a live graph preview.
 *
 * Props:
 *   apiBase      – string, base URL for the reinvent API root (with trailing slash)
 *   propertyName – string, the REINVENT4 component name (e.g. "Qed", "SlogP")
 *   value        – object | null, current transform params (controlled)
 *   onChange     – fn(transformParams | null) – called when transform changes
 *   disabled     – bool
 */
import React from 'react';
import { FormGroup, Input, Label, Button, Badge, Spinner } from 'reactstrap';
import TransformGraph from './TransformGraph';
import HelpButton from './HelpButton';

// ── Transform metadata (mirrors REINVENT4_TRANSFORM_META in models.py) ────────
const TRANSFORM_META = {
  sigmoid: {
    label: "Sigmoid ↗",
    description: "Smooth S-curve: reward rises 0→1 as value increases through [low, high].",
    color: "#007bff",
    help: "Maps a raw score to a reward in [0, 1] using a smooth S-shaped curve. " +
      "Values below 'low' score near 0; values above 'high' score near 1. " +
      "Use this when you want to reward molecules whose property is above a threshold " +
      "(e.g. QED ≥ 0.7, SAScore ≤ 3).",
    params: {
      low:  {
        type: "number", title: "Low", default: 0.0,
        help: "The x-value where the output reward is approximately 0.05. " +
          "Raw scores below this receive near-zero reward.",
      },
      high: {
        type: "number", title: "High", default: 1.0,
        help: "The x-value where the output reward is approximately 0.95. " +
          "Raw scores above this receive near-maximum reward.",
      },
      k: {
        type: "number", title: "Steepness k", default: 0.5, min: 0.01, max: 10.0, step: 0.05,
        help: "Controls how sharply the curve transitions between 0 and 1. " +
          "Small k (0.1–0.3) = gradual slope; large k (1–5) = steep step. " +
          "Default 0.5 is a good starting point.",
      },
    },
  },
  reverse_sigmoid: {
    label: "Reverse Sigmoid ↘",
    description: "Inverted S-curve: reward falls 1→0 as value increases through [low, high].",
    color: "#dc3545",
    help: "The mirror of Sigmoid — reward starts high and falls to zero. " +
      "Use when you want to penalise molecules whose property is above a threshold " +
      "(e.g. TPSA ≤ 140, HBondDonors ≤ 5, MolecularWeight ≤ 500).",
    params: {
      low:  {
        type: "number", title: "Low", default: 0.0,
        help: "The x-value where the output reward is approximately 0.95. " +
          "Raw scores below this receive near-maximum reward.",
      },
      high: {
        type: "number", title: "High", default: 1.0,
        help: "The x-value where the output reward is approximately 0.05. " +
          "Raw scores above this receive near-zero reward.",
      },
      k: {
        type: "number", title: "Steepness k", default: 0.5, min: 0.01, max: 10.0, step: 0.05,
        help: "Controls how sharply the curve falls from 1 to 0. " +
          "Small k (0.1–0.3) = gradual slope; large k (1–5) = steep drop. " +
          "Default 0.5 is a good starting point.",
      },
    },
  },
  double_sigmoid: {
    label: "Double Sigmoid 🔔",
    description: "Bell-shaped hump: reward peaks between low and high, falls on both sides.",
    color: "#28a745",
    help: "Combines two sigmoids to create a bell-shaped reward. " +
      "Molecules with properties inside [low, high] get a high reward; " +
      "those outside that window get low reward. " +
      "Ideal for properties with an optimal range (e.g. SlogP 1–4, MolecularWeight 200–500).\n\n" +
      "Tip: the transition width ≈ 2 × coef_div / coef_si. " +
      "For a smooth bell, keep coef_si/coef_div ≪ 1 (e.g. coef_si=4, coef_div=100 for MolecularWeight).",
    params: {
      low: {
        type: "number", title: "Low boundary", default: 0.0,
        help: "Left edge of the optimal window. " +
          "The reward rises from 0 to 1 around this point. " +
          "Values below this get near-zero reward.",
      },
      high: {
        type: "number", title: "High boundary", default: 1.0,
        help: "Right edge of the optimal window. " +
          "The reward falls from 1 to 0 around this point. " +
          "Values above this get near-zero reward.",
      },
      coef_div: {
        type: "number", title: "Scale (coef_div)", default: 100.0, min: 0.01,
        help: "Common scaling denominator. Together with coef_si and coef_se it controls " +
          "the transition width via: width ≈ 2 × coef_div / coef_si.\n" +
          "Keep at 100 and adjust coef_si/coef_se instead. " +
          "Increasing coef_div widens the transition (smoother bell).",
      },
      coef_si: {
        type: "number", title: "Left steepness (coef_si)", default: 10.0, min: 0.01,
        help: "Controls the left-side transition steepness. " +
          "Effective steepness = coef_si / coef_div.\n" +
          "Small values (1–10) = wide smooth rise; large values (50–200) = sharp cliff.\n" +
          "Rule of thumb: coef_si ≈ 200 / (0.15 × window_size) for a ~15% transition width.\n" +
          "e.g. MolecularWeight (window=350) → coef_si ≈ 4; SlogP (window=5) → coef_si ≈ 25.",
      },
      coef_se: {
        type: "number", title: "Right steepness (coef_se)", default: 10.0, min: 0.01,
        help: "Controls the right-side transition steepness. " +
          "Effective steepness = coef_se / coef_div.\n" +
          "Small values (1–10) = wide smooth fall; large values (50–200) = sharp cliff.\n" +
          "Set equal to coef_si for a symmetric bell, or use different values for an asymmetric shape.",
      },
    },
  },
  right_step: {
    label: "Right Step ▶",
    description: "Binary: 1.0 for values ≥ threshold, 0.0 otherwise.",
    color: "#6f42c1",
    help: "A hard binary switch: reward is exactly 1.0 if the raw score is at or above the threshold, " +
      "and exactly 0.0 below it. No gradual transition. " +
      "Use for pass/fail criteria like substructure presence " +
      "(MatchingSubstructure outputs 0 or 1 — a right_step at 0.5 converts this to a clean binary reward).",
    params: {
      high: {
        type: "number", title: "Threshold", default: 0.5,
        help: "The cutoff value. Raw scores ≥ this value receive reward 1.0; " +
          "scores below receive 0.0.",
      },
    },
  },
  left_step: {
    label: "Left Step ◀",
    description: "Binary: 1.0 for values ≤ threshold, 0.0 otherwise.",
    color: "#fd7e14",
    help: "The mirror of Right Step — reward is 1.0 below the threshold, 0.0 above. " +
      "Use when values must stay below a hard limit " +
      "(e.g. require a property to be absent rather than present).",
    params: {
      low: {
        type: "number", title: "Threshold", default: 0.5,
        help: "The cutoff value. Raw scores ≤ this value receive reward 1.0; " +
          "scores above receive 0.0.",
      },
    },
  },
  step: {
    label: "Step Window ↕",
    description: "Binary window: 1.0 inside [low, high], 0.0 outside.",
    color: "#20c997",
    help: "A hard binary window: reward is exactly 1.0 for values strictly inside [low, high], " +
      "and 0.0 outside. Sharper than Double Sigmoid but no gradient for optimisation. " +
      "Prefer Double Sigmoid for continuous properties; use Step for categorical checks.",
    params: {
      low: {
        type: "number", title: "Low bound", default: 0.0,
        help: "Lower boundary of the acceptable window (inclusive). " +
          "Values below this receive reward 0.0.",
      },
      high: {
        type: "number", title: "High bound", default: 1.0,
        help: "Upper boundary of the acceptable window (inclusive). " +
          "Values above this receive reward 0.0.",
      },
    },
  },
  exponential_decay: {
    label: "Exponential Decay 📉",
    description: "exp(−k·x) for x≥0, clamped to 1.0 for x<0. Penalises large positive values.",
    color: "#e83e8c",
    help: "Reward decays exponentially as the raw score grows. " +
      "For x < 0 the reward is clamped to 1.0 (full reward). " +
      "Use to softly penalise properties that can grow without bound (e.g. ring count, rotatable bonds). " +
      "The decay starts at x = 0 and approaches zero for large x.",
    params: {
      k: {
        type: "number", title: "Decay rate k", default: 1.0, min: 0.001, step: 0.1,
        help: "Controls how fast the reward decays. " +
          "Large k (e.g. 2–5) = rapid decay, half-reward at small x. " +
          "Small k (e.g. 0.1–0.3) = slow decay, tolerates larger values. " +
          "At k=1 the reward is ~0.37 at x=1 and ~0.14 at x=2.",
      },
    },
  },
};

const TRANSFORM_TYPES = Object.keys(TRANSFORM_META);

// ── Per-property defaults mirroring REINVENT4_TRANSFORM_DEFAULTS in models.py ─
// Each entry: { params, rationale, rule }
//   params   – the exact transform dict that will be emitted to TOML
//   rationale – one-sentence "why this shape"
//   rule      – the medicinal-chemistry / scoring principle it encodes
const PROPERTY_DEFAULT_RATIONALE = {
  Qed: {
    params: { type: "sigmoid", low: 0.5, high: 0.9, k: 0.5 },
    rationale: "Higher QED is always better — reward increases monotonically.",
    rule: "QED (Quantitative Estimate of Drug-likeness) already lies in [0, 1] and " +
      "combines eight Lipinski-style properties into one score. A sigmoid rising from " +
      "0.5 → 0.9 gives near-zero reward to poor candidates (QED < 0.5) and full " +
      "reward to drug-like molecules (QED > 0.9), with a smooth gradient in between " +
      "that guides RL optimisation.",
    reference: "Bickerton et al., Nature Chemistry 2012",
  },
  SlogP: {
    params: { type: "double_sigmoid", low: 0.0, high: 5.0, coef_div: 100.0, coef_si: 25.0, coef_se: 25.0 },
    rationale: "There is an optimal lipophilicity window — too low or too high is penalised.",
    rule: "Lipinski's Rule of Five sets logP < 5 for oral absorption. Values below 0 " +
      "indicate poor membrane permeability; values above 5 cause protein binding and " +
      "toxicity issues. A double sigmoid rewards the optimal window (0 – 5) and " +
      "penalises both extremes.",
    reference: "Lipinski et al., Adv. Drug Deliv. Rev. 1997; Veber et al., J. Med. Chem. 2002",
  },
  MolecularWeight: {
    params: { type: "double_sigmoid", low: 150.0, high: 500.0, coef_div: 100.0, coef_si: 4.0, coef_se: 4.0 },
    rationale: "There is an optimal molecular weight range — fragments and large molecules are penalised.",
    rule: "Lipinski's Rule of Five sets MW < 500 Da for oral bioavailability. Fragments " +
      "(MW < 150) rarely make drug candidates. A double sigmoid rewards the sweet spot " +
      "(150 – 500 Da) and smoothly penalises both extremes.",
    reference: "Lipinski et al., Adv. Drug Deliv. Rev. 1997",
  },
  TPSA: {
    params: { type: "reverse_sigmoid", low: 0.0, high: 140.0, k: 0.5 },
    rationale: "Lower TPSA is better — high polarity impedes membrane permeability.",
    rule: "Veber's rules for oral bioavailability require TPSA ≤ 140 Å². Above this " +
      "threshold molecules cannot passively cross cell membranes. A reverse sigmoid " +
      "gives full reward at TPSA = 0 and near-zero reward above 140 Å².",
    reference: "Veber et al., J. Med. Chem. 2002",
  },
  HBondAcceptors: {
    params: { type: "reverse_sigmoid", low: 0.0, high: 10.0, k: 0.5 },
    rationale: "Fewer H-bond acceptors is better — excess reduces membrane permeability.",
    rule: "Lipinski's Rule of Five sets HBA ≤ 10. Each acceptor increases aqueous " +
      "solubility but reduces passive permeability. A reverse sigmoid rewards low " +
      "counts and penalises molecules exceeding 10.",
    reference: "Lipinski et al., Adv. Drug Deliv. Rev. 1997",
  },
  HBondDonors: {
    params: { type: "reverse_sigmoid", low: 0.0, high: 5.0, k: 0.5 },
    rationale: "Fewer H-bond donors is better — excess donors reduce oral absorption.",
    rule: "Lipinski's Rule of Five sets HBD ≤ 5. Donors increase polar surface area " +
      "and hinder passive diffusion. A reverse sigmoid gives full reward at HBD = 0 " +
      "and near-zero reward above 5.",
    reference: "Lipinski et al., Adv. Drug Deliv. Rev. 1997",
  },
  NumRotBond: {
    params: { type: "reverse_sigmoid", low: 0.0, high: 10.0, k: 0.5 },
    rationale: "Fewer rotatable bonds is better — flexibility reduces oral bioavailability.",
    rule: "Veber's rules require rotatable bonds ≤ 10 for good oral bioavailability. " +
      "High flexibility increases conformational entropy and reduces membrane " +
      "permeability. A reverse sigmoid penalises molecules with > 10 bonds.",
    reference: "Veber et al., J. Med. Chem. 2002",
  },
  Csp3: {
    params: { type: "sigmoid", low: 0.2, high: 0.8, k: 0.5 },
    rationale: "Higher sp³ carbon fraction is better — more 3D character improves selectivity.",
    rule: "Lovering et al. showed that higher Fsp³ (fraction of sp³ carbons) correlates " +
      "with clinical success. Flat aromatic molecules have poor aqueous solubility and " +
      "selectivity. A sigmoid rewards 3D-rich scaffolds (Fsp³ > 0.5).",
    reference: "Lovering et al., J. Med. Chem. 2009",
  },
  NumRings: {
    params: { type: "double_sigmoid", low: 1.0, high: 4.0, coef_div: 100.0, coef_si: 45.0, coef_se: 45.0 },
    rationale: "There is an optimal ring count — acyclic or over-fused molecules are both penalised.",
    rule: "Drug-like molecules typically contain 1–4 rings. Acyclic structures have poor " +
      "selectivity; molecules with > 4 fused rings are poorly soluble and hard to " +
      "synthesise. A double sigmoid rewards the 1–4 ring window.",
    reference: "Lipinski et al., Adv. Drug Deliv. Rev. 1997",
  },
  NumAromaticRings: {
    params: { type: "double_sigmoid", low: 0.0, high: 3.0, coef_div: 100.0, coef_si: 45.0, coef_se: 45.0 },
    rationale: "There is an optimal aromatic ring count — over-aromatisation reduces solubility.",
    rule: "Excessive aromaticity (> 3 rings) leads to poor aqueous solubility, high " +
      "lipophilicity, and promiscuous binding. A double sigmoid rewards 0–3 aromatic " +
      "rings and penalises highly aromatic scaffolds.",
    reference: "Ertl et al., J. Med. Chem. 2009",
  },
  LargestRingSize: {
    params: { type: "reverse_sigmoid", low: 3.0, high: 8.0, k: 0.5 },
    rationale: "Smaller ring sizes are preferred — large macrocyclic rings reduce drug-likeness.",
    rule: "Rings larger than 8 atoms are unusual in oral drugs and indicate macrocyclic " +
      "structures with poor permeability. A reverse sigmoid penalises large rings while " +
      "allowing the common 5- and 6-membered rings to score highly.",
    reference: "Ertl et al., J. Med. Chem. 2009",
  },
  SAScore: {
    params: { type: "reverse_sigmoid", low: 1.0, high: 6.0, k: 0.5 },
    rationale: "Lower synthetic accessibility score is better — easier to synthesise.",
    rule: "SAScore (Ertl & Schuffenhauer 2009) ranges from 1 (easy) to 10 (hard). " +
      "Molecules with SAScore > 6 are typically impractical to synthesise. A reverse " +
      "sigmoid gives full reward at SAScore = 1 and near-zero reward above 6.",
    reference: "Ertl & Schuffenhauer, J. Cheminf. 2009",
  },
  TanimotoSimilarity: {
    params: { type: "sigmoid", low: 0.3, high: 0.8, k: 0.5 },
    rationale: "Higher Tanimoto similarity to the reference is better.",
    rule: "Tanimoto similarity measures fingerprint overlap with a reference molecule. " +
      "A sigmoid rising from 0.3 → 0.8 rewards structures progressively closer to " +
      "the reference, encouraging exploration around the reference scaffold without " +
      "collapsing to exact copies (similarity = 1 is not required).",
    reference: "Bajusz et al., J. Cheminf. 2015",
  },
  TanimotoDistance: {
    params: { type: "sigmoid", low: 0.3, high: 0.8, k: 0.5 },
    rationale: "Higher Tanimoto distance (diversity from reference) is rewarded.",
    rule: "Tanimoto distance = 1 − similarity. A sigmoid rising from 0.3 → 0.8 rewards " +
      "molecules that are increasingly different from the reference, useful for " +
      "scaffold-hopping or diversity-driven exploration.",
    reference: "Bajusz et al., J. Cheminf. 2015",
  },
  MatchingSubstructure: {
    params: { type: "right_step", low: 0.5, high: 0.5 },
    rationale: "The substructure is either present or absent — a binary reward is appropriate.",
    rule: "MatchingSubstructure outputs 0 (absent) or 1 (present). A right step at 0.5 " +
      "converts this binary signal into a clean reward: full reward if the required " +
      "substructure is present, zero reward otherwise. No gradient is needed because " +
      "the underlying score is already binary.",
    reference: "Standard medicinal chemistry constraint",
  },
  GroupCount: {
    params: { type: "double_sigmoid", low: 1.0, high: 5.0, coef_div: 100.0, coef_si: 45.0, coef_se: 45.0 },
    rationale: "There is an optimal count of the target group — too few or too many is penalised.",
    rule: "Functional group counts (e.g. halogens, heteroatoms) have an optimal range in " +
      "drug-like molecules. A double sigmoid rewards having 1–5 occurrences of the " +
      "specified group and penalises absence or excess.",
    reference: "Lipinski et al., Adv. Drug Deliv. Rev. 1997",
  },
  // ── Atom counts ──────────────────────────────────────────────────────────────
  NumHeavyAtoms: {
    params: { type: "double_sigmoid", low: 10.0, high: 40.0, coef_div: 100.0, coef_si: 6.7, coef_se: 6.7 },
    rationale: "There is an optimal heavy atom count — too small or too large molecules are penalised.",
    rule: "Heavy atom count (HAC) is a rough proxy for molecular complexity and size. " +
      "Fragments (HAC < 10) rarely make drugs; large molecules (HAC > 40) have poor " +
      "permeability and high molecular weight. A double sigmoid rewards the typical " +
      "drug-like range (10–40 heavy atoms), capturing similar information to MW but " +
      "without the dependency on atom type.",
    reference: "Ertl et al., J. Chem. Inf. Model. 2020; Lipinski Ro5 (MW < 500 ≈ HAC < 40)",
  },
  NumHeteroAtoms: {
    params: { type: "double_sigmoid", low: 1.0, high: 6.0, coef_div: 100.0, coef_si: 45.0, coef_se: 45.0 },
    rationale: "An optimal number of heteroatoms balances solubility and permeability.",
    rule: "Heteroatoms (N, O, S, halogens) increase polarity and H-bonding capacity. " +
      "Too few (< 1) → poor solubility, too many (> 6) → high TPSA and poor membrane " +
      "permeability. A double sigmoid rewards 1–6 heteroatoms, consistent with the " +
      "Lipinski HBA ≤ 10 and HBD ≤ 5 constraints.",
    reference: "Lipinski et al., Adv. Drug Deliv. Rev. 1997",
  },
  // ── Ring counts ───────────────────────────────────────────────────────────────
  NumAliphaticRings: {
    params: { type: "double_sigmoid", low: 0.0, high: 3.0, coef_div: 100.0, coef_si: 45.0, coef_se: 45.0 },
    rationale: "An optimal aliphatic ring count supports 3D shape without over-rigidity.",
    rule: "Aliphatic (non-aromatic) rings contribute sp³ character and 3D shape, improving " +
      "selectivity and solubility. Lovering et al. showed higher Fsp³ correlates with " +
      "clinical success. Molecules with > 3 aliphatic rings become synthetically challenging. " +
      "A double sigmoid rewards 0–3 aliphatic rings.",
    reference: "Lovering et al., J. Med. Chem. 2009",
  },
  // ── Stereocenters ─────────────────────────────────────────────────────────────
  NumAtomSteroCenters: {
    params: { type: "reverse_sigmoid", low: 0.0, high: 3.0, k: 0.5 },
    rationale: "Fewer stereocenters is better — each stereocenter doubles synthesis difficulty.",
    rule: "Each stereocenter requires stereoselective synthesis, making scale-up exponentially " +
      "harder. Most oral drugs have 0–2 stereocenters. A reverse sigmoid gives full reward " +
      "to achiral/simple molecules and progressively penalises complex sterochemistry above 3 centers.",
    reference: "Lovering et al., J. Med. Chem. 2009; Practical synthesis guidelines",
  },
};

// Property-specific x-axis range hints (raw score axis)
const PROPERTY_X_RANGES = {
  Qed:               [0, 1],
  SlogP:             [-3, 8],
  MolecularWeight:   [0, 800],
  TPSA:              [0, 250],
  HBondAcceptors:    [0, 15],
  HBondDonors:       [0, 10],
  NumRotBond:        [0, 20],
  Csp3:              [0, 1],
  NumHeavyAtoms:     [0, 60],
  NumHeteroAtoms:    [0, 12],
  NumRings:          [0, 8],
  NumAromaticRings:  [0, 6],
  NumAliphaticRings: [0, 6],
  LargestRingSize:   [0, 12],
  NumAtomSteroCenters: [0, 8],
  SAScore:           [1, 10],
  TanimotoSimilarity:[0, 1],
  TanimotoDistance:  [0, 1],
  MatchingSubstructure: [0, 1],
  GroupCount:        [0, 8],
};

function buildDefaultParams(type) {
  const meta = TRANSFORM_META[type];
  if (!meta) return {};
  const p = {};
  for (const [k, def] of Object.entries(meta.params)) {
    p[k] = def.default;
  }
  return { type, ...p };
}

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Auto-scale coef_si/coef_se for double_sigmoid so transition ≈ 15% of window.
// Formula: coef_si = 2 * coef_div / (0.15 * window)
function autoCoef(low, high, coef_div = 100) {
  const window = Math.abs(high - low);
  if (window === 0) return 10;
  const coef = (2 * coef_div) / (0.15 * window);
  // Round to 1 decimal, clamp to [0.5, 500]
  return Math.min(500, Math.max(0.5, Math.round(coef * 10) / 10));
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TransformSelector({ apiBase, propertyName, value, onChange, disabled }) {
  // Resolve initial type from value prop or default
  const initType = (value && value.type) ? value.type : null;
  const [selectedType, setSelectedType] = React.useState(initType);
  const [params, setParams] = React.useState(value || {});
  const [graphData, setGraphData] = React.useState(null);
  const [graphLoading, setGraphLoading] = React.useState(false);

  // Graph data for the auto-default preview (shown when selectedType is null)
  const [defaultGraphData, setDefaultGraphData] = React.useState(null);
  const [defaultGraphLoading, setDefaultGraphLoading] = React.useState(false);

  // Sync when `value` prop changes from parent (e.g. loaded from API)
  React.useEffect(() => {
    if (value && value.type) {
      setSelectedType(value.type);
      setParams(value);
    } else {
      setSelectedType(null);
      setParams({});
    }
  }, [value]);

  const debouncedParams = useDebounce(params, 400);

  // Lookup the rationale entry for the current property (used in auto-default mode)
  const defaultEntry = propertyName ? PROPERTY_DEFAULT_RATIONALE[propertyName] : null;

  // Compute x-axis range for the preview graph
  const xRange = React.useMemo(() => {
    if (propertyName && PROPERTY_X_RANGES[propertyName]) {
      return PROPERTY_X_RANGES[propertyName];
    }
    // Derive from low/high params if available
    const lo = parseFloat(params.low);
    const hi = parseFloat(params.high);
    if (!isNaN(lo) && !isNaN(hi) && lo < hi) {
      const span = hi - lo;
      return [lo - span * 0.5, hi + span * 0.5];
    }
    return [0, 1];
  }, [propertyName, params.low, params.high]);

  // x-range for the default preview (uses property range if available, else derived from default params)
  const defaultXRange = React.useMemo(() => {
    if (propertyName && PROPERTY_X_RANGES[propertyName]) return PROPERTY_X_RANGES[propertyName];
    if (!defaultEntry) return [0, 1];
    const lo = parseFloat(defaultEntry.params.low);
    const hi = parseFloat(defaultEntry.params.high);
    if (!isNaN(lo) && !isNaN(hi) && lo < hi) {
      const span = hi - lo;
      return [lo - span * 0.5, hi + span * 0.5];
    }
    return [0, 1];
  }, [propertyName, defaultEntry]);

  // Fetch graph for the auto-default transform whenever property changes and no type is selected
  React.useEffect(() => {
    if (selectedType || !defaultEntry) {
      setDefaultGraphData(null);
      return;
    }
    let cancelled = false;
    const url = new URL('property-scorers/preview-transform/', apiBase);
    setDefaultGraphLoading(true);
    fetch(url.toString(), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transform: defaultEntry.params,
        x_min: defaultXRange[0],
        x_max: defaultXRange[1],
        n_points: 250,
      }),
    })
      .then(r => r.json())
      .then(data => { if (!cancelled && data.x && data.y) setDefaultGraphData(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDefaultGraphLoading(false); });
    return () => { cancelled = true; };
  }, [selectedType, defaultEntry, defaultXRange, apiBase]);

  // Fetch graph data from API
  React.useEffect(() => {
    if (!selectedType || !debouncedParams.type) {
      setGraphData(null);
      return;
    }
    let cancelled = false;
    const url = new URL('property-scorers/preview-transform/', apiBase);
    setGraphLoading(true);
    fetch(url.toString(), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transform: debouncedParams,
        x_min: xRange[0],
        x_max: xRange[1],
        n_points: 250,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.x && data.y) setGraphData(data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGraphLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedParams, xRange, apiBase, selectedType]);

  const handleTypeChange = (newType) => {
    if (!newType) {
      setSelectedType(null);
      setParams({});
      onChange && onChange(null);
      return;
    }
    const defaults = buildDefaultParams(newType);
    // Carry over low/high from previous params if they exist
    if (params.low !== undefined) defaults.low = params.low;
    if (params.high !== undefined) defaults.high = params.high;
    // Auto-scale coef_si/coef_se for double_sigmoid based on window
    if (newType === 'double_sigmoid') {
      const lo = parseFloat(defaults.low);
      const hi = parseFloat(defaults.high);
      if (!isNaN(lo) && !isNaN(hi) && lo < hi) {
        const coef = autoCoef(lo, hi, defaults.coef_div || 100);
        defaults.coef_si = coef;
        defaults.coef_se = coef;
      }
    }
    setSelectedType(newType);
    setParams(defaults);
    onChange && onChange(defaults);
  };

  const handleParamChange = (key, rawVal) => {
    const val = parseFloat(rawVal);
    const newParams = { ...params, [key]: isNaN(val) ? rawVal : val };
    // When low or high changes on double_sigmoid, auto-update coefs
    if (selectedType === 'double_sigmoid' && (key === 'low' || key === 'high')) {
      const lo = key === 'low' ? val : parseFloat(newParams.low);
      const hi = key === 'high' ? val : parseFloat(newParams.high);
      if (!isNaN(lo) && !isNaN(hi) && lo < hi) {
        // Only auto-update if coefs are still at a "round" auto value (not manually tweaked)
        const coef = autoCoef(lo, hi, parseFloat(newParams.coef_div) || 100);
        const currentSi = parseFloat(newParams.coef_si);
        const currentSe = parseFloat(newParams.coef_se);
        // Consider it auto if both coefs are equal (symmetric) and match a plausible auto value
        if (currentSi === currentSe) {
          newParams.coef_si = coef;
          newParams.coef_se = coef;
        }
      }
    }
    setParams(newParams);
    onChange && onChange(newParams);
  };

  const meta = selectedType ? TRANSFORM_META[selectedType] : null;
  const graphColor = meta ? meta.color : '#007bff';

  return (
    <div style={{
      backgroundColor: '#f0f7ff',
      border: '1px solid #b8d4f0',
      borderRadius: 8,
      padding: '1rem',
      marginTop: '0.75rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0056b3' }}>📈 Score Transform</span>
        <HelpButton title="Score Transforms" placement="right">
          A <strong>scoring transform</strong> converts the raw molecular property value (x-axis)
          into a reward signal in [0, 1] (y-axis) that REINVENT uses during reinforcement learning.
          <br /><br />
          <strong>Available shapes:</strong>
          <ul style={{ paddingLeft: '1.2rem', marginBottom: 0, marginTop: '0.25rem' }}>
            <li><strong>Sigmoid ↗</strong> — reward molecules <em>above</em> a threshold</li>
            <li><strong>Reverse Sigmoid ↘</strong> — reward molecules <em>below</em> a threshold</li>
            <li><strong>Double Sigmoid 🔔</strong> — reward an optimal <em>range</em></li>
            <li><strong>Right/Left Step</strong> — binary pass/fail at a cutoff</li>
            <li><strong>Step Window</strong> — binary pass inside a range</li>
            <li><strong>Exponential Decay 📉</strong> — soft penalty for large values</li>
          </ul>
          <br />
          If you select <em>— Use property default —</em>, a sensible transform is applied
          automatically based on the chosen property (e.g. Reverse Sigmoid for TPSA).
        </HelpButton>
        {selectedType && (
          <Badge color="primary" pill style={{ fontSize: '0.75rem' }}>
            {TRANSFORM_META[selectedType]?.label || selectedType}
          </Badge>
        )}
        {!selectedType && (
          <Badge color="secondary" pill style={{ fontSize: '0.75rem' }}>auto-default</Badge>
        )}
      </div>

      {/* Type selector */}
      <FormGroup style={{ marginBottom: '0.75rem' }}>
        <Label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
          Transform type
          {meta && (
            <HelpButton title={meta.label} placement="right">
              {meta.help}
            </HelpButton>
          )}
          {!meta && (
            <HelpButton title="Property default" placement="right">
              When set to <em>— Use property default —</em>, GenUI automatically selects the
              most appropriate transform for the chosen property (e.g. Reverse Sigmoid for TPSA,
              Double Sigmoid for MolecularWeight). You can override this by selecting a specific type.
            </HelpButton>
          )}
        </Label>
        <Input
          type="select"
          value={selectedType || ''}
          onChange={e => handleTypeChange(e.target.value || null)}
          disabled={disabled}
          style={{ fontSize: '0.85rem' }}
        >
          <option value="">— Use property default —</option>
          {TRANSFORM_TYPES.map(t => (
            <option key={t} value={t}>{TRANSFORM_META[t].label}</option>
          ))}
        </Input>
        {meta && (
          <small style={{ color: '#6c757d', display: 'block', marginTop: 4 }}>
            {meta.description}
          </small>
        )}
      </FormGroup>

      {/* ── AUTO-DEFAULT MODE: show resolved transform + rationale ── */}
      {!selectedType && defaultEntry && (() => {
        const defTypeMeta = TRANSFORM_META[defaultEntry.params.type];
        const defColor = defTypeMeta ? defTypeMeta.color : '#6c757d';
        const defParamEntries = defTypeMeta ? Object.entries(defTypeMeta.params) : [];
        return (
          <div>
            {/* Resolved transform row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>Auto-selected:</span>
              <Badge style={{ backgroundColor: defColor, fontSize: '0.75rem' }}>
                {defTypeMeta ? defTypeMeta.label : defaultEntry.params.type}
              </Badge>
              {defParamEntries.map(([k]) => (
                defaultEntry.params[k] !== undefined && (
                  <span key={k} style={{
                    fontSize: '0.75rem', background: '#e9ecef', borderRadius: 4,
                    padding: '1px 6px', color: '#495057', fontFamily: 'monospace',
                  }}>
                    {k}={defaultEntry.params[k]}
                  </span>
                )
              ))}
            </div>

            {/* Graph + rationale side by side */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
              {/* Graph */}
              <div>
                <div style={{ fontSize: '0.78rem', color: '#6c757d', marginBottom: 4, fontWeight: 600 }}>
                  Preview ({propertyName})
                </div>
                {defaultGraphLoading
                  ? <div style={{ width: 200, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spinner size="sm" color="secondary" />
                    </div>
                  : <TransformGraph
                      xValues={defaultGraphData?.x}
                      yValues={defaultGraphData?.y}
                      xMin={defaultXRange[0]}
                      xMax={defaultXRange[1]}
                      color={defColor}
                    />
                }
              </div>

              {/* Rationale card */}
              <div style={{
                flex: 1, minWidth: 200,
                background: '#fff8e1', border: '1px solid #ffe082',
                borderRadius: 6, padding: '0.6rem 0.8rem',
                fontSize: '0.8rem', color: '#4a3800',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#7a5a00' }}>
                  💡 Why this transform?
                </div>
                <div style={{ marginBottom: '0.35rem', fontStyle: 'italic' }}>
                  {defaultEntry.rationale}
                </div>
                <div style={{ color: '#5a4400', lineHeight: 1.45 }}>
                  {defaultEntry.rule}
                </div>
                <div style={{ marginTop: '0.4rem', color: '#8a6a00', fontSize: '0.74rem' }}>
                  📚 {defaultEntry.reference}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── AUTO-DEFAULT MODE: no known default for this property ── */}
      {!selectedType && !defaultEntry && propertyName && (
        <div style={{
          fontSize: '0.8rem', color: '#6c757d', fontStyle: 'italic',
          padding: '0.4rem 0', borderTop: '1px dashed #dee2e6', marginTop: '0.25rem',
        }}>
          No built-in default for <strong>{propertyName}</strong>. Select a transform type above to configure one.
        </div>
      )}

      {/* ── MANUAL MODE: graph preview + parameter inputs ── */}
      {selectedType && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#6c757d', marginBottom: 4, fontWeight: 600 }}>
              Preview {propertyName ? `(${propertyName})` : ''}
            </div>
            <TransformGraph
              xValues={graphData?.x}
              yValues={graphData?.y}
              xMin={xRange[0]}
              xMax={xRange[1]}
              color={graphColor}
              loading={graphLoading}
            />
            {graphLoading && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <Spinner size="sm" color="primary" />
                <span style={{ marginLeft: 6, fontSize: '0.78rem', color: '#6c757d' }}>updating…</span>
              </div>
            )}
          </div>

          {/* Parameter inputs */}
          {meta && Object.keys(meta.params).length > 0 && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: '0.78rem', color: '#6c757d', marginBottom: 6, fontWeight: 600 }}>
                Parameters
              </div>
              {Object.entries(meta.params).map(([key, def]) => (
                <FormGroup key={key} style={{ marginBottom: '0.5rem' }}>
                  <Label style={{ fontSize: '0.8rem', marginBottom: 2, color: '#343a40', display: 'flex', alignItems: 'center' }}>
                    {def.title}
                    {def.help && (
                      <HelpButton title={def.title} placement="right">
                        {def.help}
                      </HelpButton>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step={def.step || (def.type === 'number' ? 0.01 : 1)}
                    min={def.min}
                    max={def.max}
                    value={params[key] !== undefined ? params[key] : def.default}
                    onChange={e => handleParamChange(key, e.target.value)}
                    disabled={disabled}
                    style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                  />
                </FormGroup>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reset button — only shown in manual mode */}
      {selectedType && (
        <Button
          size="sm"
          color="link"
          style={{ padding: 0, fontSize: '0.78rem', marginTop: '0.5rem', color: '#6c757d' }}
          onClick={() => handleTypeChange(null)}
          disabled={disabled}
        >
          ↩ Reset to property default
        </Button>
      )}
    </div>
  );
}

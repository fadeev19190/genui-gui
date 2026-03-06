import React from "react";
import { Card, CardBody } from "reactstrap";

// ── Clickable tab link ────────────────────────────────────────────────────────
function TabLink({ tab, onTabChange, children }) {
  return (
    <button
      type="button"
      onClick={() => { if (onTabChange) onTabChange(tab); }}
      style={{
        background: "none", border: "none", padding: 0,
        color: "#0d6efd", fontWeight: 600, textDecoration: "none",
        cursor: "pointer", font: "inherit",
      }}
    >
      {children}
    </button>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ icon, title, accent, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{
      marginBottom: "0.85rem", borderRadius: "8px", overflow: "hidden",
      border: `1px solid #e9ecef`, borderLeft: `4px solid ${accent}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0.85rem 1.25rem",
          background: open ? "#fafafa" : "#fff",
          border: "none", cursor: "pointer",
          textAlign: "left", transition: "background 0.15s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.1rem" }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: "0.97rem", color: "#212529" }}>{title}</span>
        </span>
        <span style={{
          fontSize: "0.75rem", color: accent, fontWeight: 700,
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s", display: "inline-block",
        }}>▶</span>
      </button>
      {open && (
        <div style={{
          padding: "1rem 1.25rem 1.1rem",
          borderTop: "1px solid #f0f0f0",
          fontSize: "0.93rem", lineHeight: 1.75, color: "#333",
          background: "#fff",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Workflow diagram ──────────────────────────────────────────────────────────
function WorkflowDiagram({ onTabChange }) {
  const steps = [
    { n: "1", label: "Compounds", sub: "Upload your SMILES dataset", icon: "📂", tab: null, color: "#6f42c1" },
    { n: "2", label: "Model Designer", sub: "Fine-tune the generator\non your chemistry", icon: "🎓", tab: "Model Designer", color: "#0d6efd" },
    { n: "3", label: "Scoring Components", sub: "Define the properties\nyou want to optimise", icon: "🎯", tab: "Scoring Components", color: "#fd7e14" },
    { n: "4", label: "Environment Creator", sub: "Link model + diversity\nfilter together", icon: "⚙️", tab: "Environment Creator", color: "#6c757d" },
    { n: "5", label: "Staged Learning", sub: "Assign scorers, run\noptimisation", icon: "📈", tab: "Staged Learning", color: "#198754" },
    { n: "6", label: "Results", sub: "Browse generated\nmolecule sets", icon: "🔬", tab: "Staged Learning", color: "#dc3545" },
  ];

  return (
    <div style={{
      background: "linear-gradient(135deg, #f0f7ff 0%, #f8f9fa 100%)",
      borderRadius: "10px", padding: "1.5rem 1rem",
      border: "1px solid #dee2e6", marginBottom: "1.75rem",
    }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "#6c757d", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
        Recommended Workflow
      </div>

      {/* Steps row */}
      <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", flexWrap: "wrap", gap: "0" }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            {/* Step box */}
            <div
              onClick={() => s.tab && onTabChange && onTabChange(s.tab)}
              title={s.tab ? `Go to ${s.tab}` : undefined}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "0.85rem 0.6rem", width: "115px", minWidth: "90px",
                background: "#fff", borderRadius: "8px",
                border: `2px solid ${s.color}22`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                cursor: s.tab ? "pointer" : "default",
                transition: "box-shadow 0.15s, transform 0.15s",
                position: "relative",
              }}
              onMouseEnter={e => { if (s.tab) { e.currentTarget.style.boxShadow = `0 4px 12px ${s.color}44`; e.currentTarget.style.transform = "translateY(-2px)"; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "none"; }}
            >
              {/* Circle badge */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: s.color, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", marginBottom: "0.45rem",
                boxShadow: `0 2px 6px ${s.color}66`,
              }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#212529", textAlign: "center", lineHeight: 1.3 }}>
                {s.label}
              </div>
              <div style={{ fontSize: "0.71rem", color: "#6c757d", textAlign: "center", marginTop: "0.25rem", lineHeight: 1.35, whiteSpace: "pre-line" }}>
                {s.sub}
              </div>
              {s.tab && (
                <div style={{ fontSize: "0.66rem", color: s.color, fontWeight: 600, marginTop: "0.35rem" }}>tap to open →</div>
              )}
            </div>
            {/* Arrow between steps */}
            {i < steps.length - 1 && (
              <div style={{
                display: "flex", alignItems: "center", padding: "0 0.15rem",
                color: "#adb5bd", fontSize: "1.1rem", alignSelf: "center",
              }}>›</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AboutPage(props) {
  const { onTabChange } = props;

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: 880, margin: "0 auto" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <h2 style={{ fontWeight: 800, marginBottom: "0.35rem", letterSpacing: "-0.01em" }}>REINVENT 4</h2>
        <p style={{ fontSize: "1.05rem", color: "#555", maxWidth: 640, margin: "0 auto 1rem" }}>
          A tool that <strong>generates new drug-like molecules</strong> and learns to make them
          better — guided by the chemical properties you care about.
        </p>
        <a href="https://link.springer.com/article/10.1186/s13321-024-00812-5"
          target="_blank" rel="noreferrer"
          style={{
            display: "inline-block", padding: "0.4rem 1rem",
            backgroundColor: "#0d6efd", color: "#fff",
            borderRadius: 4, textDecoration: "none",
            fontWeight: 600, fontSize: "0.85rem",
          }}>
          📄 Original publication →
        </a>
      </div>

      {/* Workflow diagram */}
      <WorkflowDiagram onTabChange={onTabChange} />

      {/* Sections */}
      <Section icon="🧪" title="What does REINVENT 4 do?" accent="#0d6efd" defaultOpen={true}>
        <p>
          REINVENT 4 generates novel molecules and scores each one against the properties you
          define — for example drug-likeness (QED), logP, TPSA, H-bond donors/acceptors, ring
          counts, or the absence of reactive alerts. It then shifts its output toward molecules
          that score better, step by step.
        </p>
        <p style={{ marginBottom: 0 }}>
          Think of it as a <strong>chemistry-aware idea generator</strong>: it proposes
          thousands of new structures per run, filtered and shaped by your project's design
          criteria — without you having to enumerate them manually.
        </p>
      </Section>

      <Section icon="🎓" title="Model Designer — focus on your chemistry" accent="#6f42c1">
        <p>
          By default, REINVENT 4 generates broadly drug-like molecules. If your project focuses on
          a specific chemical series — a scaffold family, a particular heteroaromatic core, a
          company's compound collection — you can <strong>fine-tune the generator</strong> on that
          chemistry first. This step is called <strong>Transfer Learning</strong>.
        </p>
        <p style={{ marginBottom: 0 }}>
          You provide a set of representative SMILES and the generator adapts to favour that
          chemical space. Subsequent optimization then starts from a much better baseline — less
          time wasted on irrelevant scaffolds, faster convergence to your objectives.
        </p>
        <p style={{ marginBottom: 0, marginTop: "0.6rem" }}>
          ➡️ <TabLink tab="Model Designer" onTabChange={onTabChange}>Open Model Designer</TabLink>
        </p>
      </Section>

      <Section icon="🎯" title="Scoring Components — defining your objectives" accent="#fd7e14">
        <p>
          Scoring components are the <strong>design criteria</strong> you want to optimise. Each
          one evaluates a molecular property and returns a score from 0 to 1. Examples:
        </p>
        <ul style={{ marginBottom: "0.75rem" }}>
          <li><strong>QED</strong> — overall drug-likeness (higher = more drug-like)</li>
          <li><strong>LogP</strong> — lipophilicity (keep it in a window, e.g. 1–4)</li>
          <li><strong>TPSA</strong> — polar surface area (linked to membrane permeability)</li>
          <li><strong>MatchingSubstructure</strong> — reward or require a specific SMARTS motif</li>
          <li><strong>SAScore</strong> — synthetic accessibility (lower = easier to make)</li>
        </ul>
        <p style={{ marginBottom: "0.6rem" }}>
          You can apply a <strong>transform</strong> (sigmoid, step function, etc.) to each score
          to express ranges and preferences — for example "logP between 2 and 4 scores 1, outside
          that window scores 0".
        </p>
        <p style={{ marginBottom: 0 }}>
          Scorers are assigned to individual stages inside <TabLink tab="Staged Learning" onTabChange={onTabChange}>Staged Learning</TabLink>.
          {" "}Create them here first, then pick which ones apply to each stage.
        </p>
        <p style={{ marginBottom: 0, marginTop: "0.6rem" }}>
          ➡️ <TabLink tab="Scoring Components" onTabChange={onTabChange}>Open Scoring Components</TabLink>
        </p>
      </Section>

      <Section icon="⚙️" title="Environment Creator — connecting model and diversity filter" accent="#6c757d">
        <p>
          Before running optimization you need to create an <strong>Environment</strong> — a
          configuration that links your trained model (from Model Designer) with a
          <strong> diversity filter</strong> (which prevents the generator from converging to a
          single repetitive scaffold).
        </p>
        <p style={{ marginBottom: 0 }}>
          Scoring components are <em>not</em> set here — they are assigned per stage inside Staged Learning.
        </p>
        <p style={{ marginBottom: 0, marginTop: "0.6rem" }}>
          ➡️ <TabLink tab="Environment Creator" onTabChange={onTabChange}>Open Environment Creator</TabLink>
        </p>
      </Section>

      <Section icon="📈" title="Staged Learning — running the optimization" accent="#198754">
        <p>
          Staged Learning is where you put everything together and run the optimization. Each
          <strong> stage</strong> is a training phase with its own set of scoring components and
          stopping criteria. Stages let you <strong>layer constraints progressively</strong>:
        </p>
        <ol style={{ paddingLeft: "1.4rem", marginBottom: "0.75rem" }}>
          <li><strong>Stage 1</strong> — enforce basic drug-likeness (MW, logP, rotatable bonds, alerts).</li>
          <li><strong>Stage 2</strong> — add stricter or more specific property windows.</li>
          <li><strong>Stage 3+</strong> — refine toward the final desired profile.</li>
        </ol>
        <p style={{ marginBottom: "0.6rem" }}>
          Each stage continues from where the previous one ended, so the generator builds up toward
          your full objective gradually — giving better diversity and stability than trying to
          satisfy everything at once from the start.
        </p>
        <p style={{ marginBottom: 0 }}>
          ➡️ <TabLink tab="Staged Learning" onTabChange={onTabChange}>Open Staged Learning</TabLink>
        </p>
      </Section>

      {/* Quick-reference card */}
      <Card style={{ border: "2px solid #0d6efd", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginTop: "0.5rem" }}>
        <div style={{ background: "#0d6efd", color: "#fff", padding: "0.7rem 1.25rem", fontWeight: 700, fontSize: "0.95rem" }}>
          🗺️ Step-by-step checklist
        </div>
        <CardBody style={{ fontSize: "0.9rem", lineHeight: 1.85, padding: "1rem 1.25rem" }}>
          <ol style={{ paddingLeft: "1.4rem", marginBottom: 0 }}>
            <li>Go to <em>Compounds</em> and upload a SMILES dataset for your chemical domain.</li>
            <li><TabLink tab="Model Designer" onTabChange={onTabChange}>Model Designer</TabLink> — create a network and train it on your compound set.</li>
            <li><TabLink tab="Scoring Components" onTabChange={onTabChange}>Scoring Components</TabLink> — add the property scorers you want to optimise for.</li>
            <li><TabLink tab="Environment Creator" onTabChange={onTabChange}>Environment Creator</TabLink> — link the model and choose a diversity filter.</li>
            <li><TabLink tab="Staged Learning" onTabChange={onTabChange}>Staged Learning</TabLink> → <em>Agents</em> — create an agent using your environment.</li>
            <li><TabLink tab="Staged Learning" onTabChange={onTabChange}>Staged Learning</TabLink> → <em>Runs</em> — configure stages, assign scorers, and start training.</li>
            <li><TabLink tab="Staged Learning" onTabChange={onTabChange}>Staged Learning</TabLink> → <em>Generated Molecules</em> — browse and export your results.</li>
          </ol>
        </CardBody>
      </Card>

    </div>
  );
}

import React from "react";
import Form from "@rjsf/bootstrap-4";
import { ComponentWithObjects } from '../../../../../genui';
import { Button, Badge, Alert, Row, Col, Container } from 'reactstrap';
import { Chart } from 'react-chartjs-2';
import CardGrid from './CardGrid';
import HelpButton from './HelpButton';

// Custom slider widget that shows a range input alongside its current numeric value
function SliderWidget(props) {
  const { id, value, onChange, schema, disabled, readonly, label, options } = props;
  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 1;
  const step = schema.multipleOf ?? 0.01;
  const current = value ?? schema.default ?? min;
  // Use the custom title passed via ui:options, fall back to label or schema.title
  const displayLabel = (options && options.customTitle) || label || schema.title || "";

  return (
    <div style={{ marginBottom: "1rem" }}>
      {displayLabel && (
        <label htmlFor={id} style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.4rem", display: "block" }}>
          {displayLabel}
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ minWidth: "2.5rem", textAlign: "right", fontSize: "0.85rem", color: "#6c757d" }}>
          {min}
        </span>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled || readonly}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, cursor: disabled ? "not-allowed" : "pointer" }}
        />
        <span style={{ minWidth: "2.5rem", textAlign: "left", fontSize: "0.85rem", color: "#6c757d" }}>
          {max}
        </span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled || readonly}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          style={{
            width: "5rem",
            textAlign: "center",
            fontWeight: "600",
            fontSize: "0.95rem",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            padding: "0.25rem 0.4rem"
          }}
        />
      </div>
    </div>
  );
}

const TYPE_OPTIONS = [
  {
    value: "ClippedScore",
    label: "Clipped Score",
    description: "Clip scores to a range and apply smooth sigmoid transformation"
  },
  {
    value: "SmoothHump",
    label: "Smooth Hump",
    description: "Create a smooth bell curve with peak between lower and upper bounds"
  }
];

// Chart component to visualize modifier transformation
function ModifierChart(props) {
  const datasets = [
    {
      label: props.title,
      fill: false,
      data: props.outputs,
      backgroundColor: '#36a2eb',
      borderColor: '#36a2eb'
    }
  ];
  const data = {
    labels: props.inputs,
    datasets: datasets
  };
  return (
    <Chart
      data={data}
      type='line'
      options={{
        scales: {
          x: {
            title: {
              display: true,
              text: 'Input Score'
            },
          },
          y: {
            title: {
              display: true,
              text: 'Modified Score'
            }
          }
        },
        title: {
          display: true,
          text: 'Modifier Transformation Preview'
        },
        elements: {
          point:{
            radius: 0
          }
        }
      }}
    />
  );
}

// Test chart that fetches and displays modifier output
function TestChart(props) {
  const [outputs, setOutputs] = React.useState(null);
  const [inputs, setInputs] = React.useState([]);

  const fillInputs = (min, max, step) => {
    const new_inputs = []
    let i = min
    while (i <= max) {
      i = i+step;
      new_inputs.push(i);
    }
    setInputs(new_inputs);
  };

  React.useEffect(() => {
    fillInputs(props.min, props.max, props.step)
  }, [props.min, props.max, props.step]);

  React.useEffect(() => {
    if (!inputs || inputs.length === 0 || !props.data) {
      return;
    }

    fetch(new URL("test/", props.url), {
      method: 'POST',
      credentials: "include",
      body: JSON.stringify({inputs: inputs, params: props.data}),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => response.json()).then(
      (data) => {
        setOutputs(data.results)
      }
    ).catch(
      (error) => {
        console.error("Error fetching modifier test data:", error);
        setOutputs(null);
      }
    )
  }, [inputs, props.data, props.url])

  return (
    <div className="modifier-test-chart">
      {outputs ? (
        <ModifierChart inputs={inputs} outputs={outputs} title={props.title}/>
      ) : (
        <div style={{padding: "2rem", textAlign: "center", color: "#6c757d"}}>
          Adjust parameters to preview transformation...
        </div>
      )}
    </div>
  )
}

function ModifierForm(props) {
  const [type, setType] = React.useState(TYPE_OPTIONS[0].value);
  const [formData, setFormData] = React.useState({});

  const baseSchema = {
    type: "object",
    required: ["name"],
    properties: {
      name: {type: "string", title: "Modifier Name", minLength: 1},
      description: {type: "string", title: "Description (Optional)"}
    }
  };

  const typeSchema = type === "ClippedScore" ? {
    upper: {type: "number", title: "Upper Bound (high raw score)", default: 1.0, minimum: -100, maximum: 100, multipleOf: 0.01},
    lower: {type: "number", title: "Lower Bound (low raw score)", default: 0.0, minimum: -100, maximum: 100, multipleOf: 0.01},
    high: {type: "number", title: "High Output (reward when input ≥ upper)", default: 1.0, minimum: 0, maximum: 1, multipleOf: 0.01},
    low: {type: "number", title: "Low Output (reward when input ≤ lower)", default: 0.0, minimum: 0, maximum: 1, multipleOf: 0.01},
    smooth: {type: "boolean", title: "Use Reverse Sigmoid (smooth transition)", default: true}
  } : {
    upper: {type: "number", title: "Upper Bound", default: 1.0, minimum: -100, maximum: 100, multipleOf: 0.01},
    lower: {type: "number", title: "Lower Bound", default: 0.0, minimum: -100, maximum: 100, multipleOf: 0.01},
    sigma: {type: "number", title: "Sigma (Width)", default: 0.1, minimum: 0.01, maximum: 2.0, multipleOf: 0.01}
  };

  const schema = {
    ...baseSchema,
    properties: {
      ...baseSchema.properties,
      ...typeSchema
    }
  };

  const uiSchema = {
    description: {"ui:widget": "textarea"},
    name: {
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Modifier Name
        <HelpButton title="Modifier Name">A label shown in the scorer dropdown. Use a descriptive name that reflects the transformation, e.g. "QED_clip_0.6-1" or "MW_hump_300-500".</HelpButton>
      </span>
    },
    upper: type === "ClippedScore" ? {
      // Plain number input for ClippedScore (wide range: -100 to 100)
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Upper Bound (raw score)
        <HelpButton title="Upper Bound">The raw input score at which the modifier output reaches its maximum. For most properties this is 0–1, but for docking scores it can be negative (e.g. -7).</HelpButton>
      </span>
    } : {
      "ui:widget": SliderWidget,
      "ui:options": {
        label: false,
        customTitle: <span style={{ display: "flex", alignItems: "center" }}>
          Upper Bound
          <HelpButton title="Upper Bound">The upper edge of the bell-curve hump. Input values above this are penalised (output falls toward 0).</HelpButton>
        </span>
      },
    },
    lower: type === "ClippedScore" ? {
      // Plain number input for ClippedScore (wide range: -100 to 100)
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Lower Bound (raw score)
        <HelpButton title="Lower Bound">The raw input score at which the modifier output reaches its minimum. For most properties this is 0–1, but for docking scores it can be negative (e.g. -13.5).</HelpButton>
      </span>
    } : {
      "ui:widget": SliderWidget,
      "ui:options": {
        label: false,
        customTitle: <span style={{ display: "flex", alignItems: "center" }}>
          Lower Bound
          <HelpButton title="Lower Bound">The lower edge of the bell-curve hump. Input values below this are penalised (output falls toward 0).</HelpButton>
        </span>
      },
    },
    high: {
      "ui:widget": SliderWidget,
      "ui:options": {
        label: false,
        customTitle: <span style={{ display: "flex", alignItems: "center" }}>
          High Output (0–1)
          <HelpButton title="High Output">The output reward value when the input score is at or above the Upper Bound. Usually 1.0. Decrease it if you want to cap the maximum reward for this component.</HelpButton>
        </span>
      },
    },
    low: {
      "ui:widget": SliderWidget,
      "ui:options": {
        label: false,
        customTitle: <span style={{ display: "flex", alignItems: "center" }}>
          Low Output (0–1)
          <HelpButton title="Low Output">The output reward value when the input score is at or below the Lower Bound. Usually 0.0. Increase it slightly if you want to give partial credit even for out-of-range values.</HelpButton>
        </span>
      },
    },
    smooth: {
      "ui:title": <span style={{ display: "flex", alignItems: "center" }}>
        Use Reverse Sigmoid (smooth transition)
        <HelpButton title="Reverse Sigmoid">When enabled, applies a REINVENT reverse_sigmoid transform instead of a hard double_sigmoid clipping. Produces smooth gradients between the lower and upper bounds. Recommended for most use cases. The steepness (k) is automatically derived from the High/Low output values.</HelpButton>
      </span>
    },
    sigma: {
      "ui:widget": SliderWidget,
      "ui:options": {
        label: false,
        customTitle: <span style={{ display: "flex", alignItems: "center" }}>
          Sigma (Width)
          <HelpButton title="Sigma">Controls the steepness of the bell-curve sides. A smaller sigma creates a sharper, narrower peak (very selective). A larger sigma creates a broader, more forgiving hump. Default: 0.1.</HelpButton>
        </span>
      },
    },
  };

  const selectedTypeInfo = TYPE_OPTIONS.find(t => t.value === type);

  return (
    <Container fluid>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>
          Select Modifier Type
          <HelpButton title="Score Modifiers">
            Score modifiers transform a scorer's raw output (0–1) into a shaped reward signal before it enters the aggregation step.<br /><br />
            <strong>Clipped Score</strong> — maps input values linearly (or with smooth sigmoid) between a lower and upper bound. Values outside the bounds are clipped to 0 or 1. Use this to reward a specific property range.<br /><br />
            <strong>Smooth Hump</strong> — creates a bell-curve peak centred between the lower and upper bounds. The agent is rewarded most for values near the centre and less for values at the edges. Good for targeting a narrow optimal window (e.g. MW 350–450 Da).
          </HelpButton>
        </label>
        <select
          className="form-control"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            fontSize: "1rem",
            padding: "0.75rem",
            border: "2px solid #6c757d",
            borderRadius: "4px"
          }}
        >
          {TYPE_OPTIONS.map(item => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      <Row>
        <Col xs="12"><hr/></Col>
      </Row>

      <Row>
        <Col xs="6">
          <h6 style={{ fontWeight: "600", marginBottom: "1rem" }}>⚙️ Modifier Parameters</h6>
          <Form
            showErrorList={false}
            schema={schema}
            uiSchema={uiSchema}
            widgets={{ SliderWidget }}
            formData={formData}
            onChange={data => setFormData(data.formData)}
            onError={data => console.error("Modifier form errors:", data)}
            onSubmit={(data) => {
              const payload = {
                ...data.formData,
                type: type,
                project: props.currentProject.id
              };
              const result = props.onAdd(props.title, payload);

              // Trigger data refresh in parent if available
              if (props.triggerDataRefresh) {
                setTimeout(() => {
                  props.triggerDataRefresh('Modifiers');
                }, 500);
              }

              return result;
            }}
          >
            <Button type="submit" color="secondary" size="lg" style={{ marginTop: "1rem", fontWeight: "600" }}>
              ➕ Create {type === "ClippedScore" ? "Clipped Score" : "Smooth Hump"} Modifier
            </Button>
          </Form>
        </Col>
        <Col xs="6">
          <h6 style={{ fontWeight: "600", marginBottom: "1rem" }}>📈 Live Preview</h6>
          <TestChart
            data={{...formData, type: type}}
            url={new URL('score-modifiers/', props.apiUrls.reinventRoot)}
            min={0}
            max={1}
            step={0.01}
            title={selectedTypeInfo.label}
          />
        </Col>
      </Row>
    </Container>
  )
}

export default function Modifiers(props) {
  return (
    <ComponentWithObjects
      {...props}
      commitObjects={true}
      objectListURL={new URL('score-modifiers/', props.apiUrls.reinventRoot)}
      emptyClassName="ScoreModifiers"
      render={(data, x, handleAdd, handleDelete) => {
        const modifiers = data.ScoreModifiers || [];

        return (
          <React.Fragment>
            <div style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>
                Create Score Modifiers
                {modifiers.length > 0 && (
                  <Badge color="secondary" style={{ marginLeft: "1rem", fontSize: "0.8rem" }}>
                    {modifiers.length} modifier{modifiers.length !== 1 ? 's' : ''} created
                  </Badge>
                )}
              </h4>
              <p style={{ color: "#6c757d", marginBottom: 0 }}>
                Optional: Transform score values for more fine-grained control
              </p>
            </div>

            <ModifierForm
              {...props}
              title="ScoreModifiers"
              onAdd={handleAdd}
            />

            {modifiers.length > 0 && (
              <React.Fragment>
                <hr style={{ margin: "2rem 0" }}/>
                <h5 style={{ marginBottom: "1rem" }}>
                  🔧 Your Score Modifiers
                </h5>
                <CardGrid
                  data={modifiers}
                  itemDataComponent={({item}) => (
                    <React.Fragment>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <Badge color="secondary">
                          {item.type === "ClippedScore" ? "📏 Clipped" : "📊 Hump"}
                        </Badge>
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                        {item.name}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: "0.85rem", color: "#6c757d", marginBottom: "0.5rem" }}>
                          {item.description}
                        </div>
                      )}
                      <div style={{ fontSize: "0.85rem" }}>
                        <em>Range:</em> [{item.lower ?? "--"}, {item.upper ?? "--"}]<br/>
                        {item.type === "ClippedScore" ? (
                          <>
                            <em>Scores:</em> Low={item.low ?? "--"}, High={item.high ?? "--"}<br/>
                            <em>Smooth:</em> {item.smooth ? "Yes" : "No"}
                          </>
                        ) : (
                          <>
                            <em>Sigma:</em> {item.sigma ?? "--"}
                          </>
                        )}
                      </div>
                    </React.Fragment>
                  )}
                  onDelete={(item) => handleDelete("ScoreModifiers", item)}
                />
              </React.Fragment>
            )}

            {modifiers.length === 0 && (
              <Alert color="info" style={{ marginTop: "2rem" }}>
                <h6>ℹ️ No modifiers yet</h6>
                Score modifiers are optional. You can create them if you need to transform scores
                (e.g., clip outliers, create preference for target ranges).
              </Alert>
            )}
          </React.Fragment>
        );
      }}
    />
  )
}
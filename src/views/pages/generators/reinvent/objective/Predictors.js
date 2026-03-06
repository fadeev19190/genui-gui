import React from "react";
import Form from "@rjsf/bootstrap-4";
import { ComponentWithObjects, ComponentWithResources } from '../../../../../genui';
import { Button, FormGroup, Input, Label } from 'reactstrap';
import CardGrid from './CardGrid';

function ModelScorerForm(props) {
  const models = props.models;

  const schema = {
    type: "object",
    required: ["name", "model"],
    properties: {
      name: {type: "string", title: "Name", minLength: 1, default: ""},
      weight: {type: "number", title: "Weight", default: 1.0},
      model: {type: "integer", title: "QSAR Model (Required)", enum: models.map(item => item.id)}
    }
  };

  const ItemField = (fieldProps) => {
    return (
      <FormGroup>
        <Label>{fieldProps.schema.title}</Label>
        <Input
          type="select"
          id={fieldProps.id}
          value={fieldProps.value || ""}
          required={fieldProps.required}
          onChange={(event) => {
            const newValue = event.target.value;
            fieldProps.onChange(newValue === "" ? undefined : newValue);
          }}
        >
          <option value="">---</option>
          {models.map(item => (
            <option key={item.id} value={item.id}>
              {item.name || item.aggregation_type || `ID: ${item.id}`}
            </option>
          ))}
        </Input>
      </FormGroup>
    );
  };

  const uiSchema = {
    model: {"ui:widget": ItemField}
  };

  return (
    <Form
      showErrorList={true}
      schema={schema}
      uiSchema={uiSchema}
      onError={errors => {
        console.error("ModelScorer form validation errors:", errors);
        alert("Form validation failed. Check console for details.");
      }}
      onSubmit={(data) => {
        const payload = data.formData;
        payload.model = payload.model ? Number(payload.model) : null;
        if (!payload.model) { alert("QSAR Model is required!"); return; }
        try { props.onAdd(payload); } catch (error) { alert(`Error: ${error.message}`); }
      }}
    >
      <Button type="submit" color="primary" size="lg">
        Create Model Scorer
      </Button>
    </Form>
  )
}

function ModelScorersList(props) {
  return (
    <CardGrid
      data={props.data}
      itemDataComponent={({item}) => (
        <React.Fragment>
          <em>Model:</em> {props.modelMap[item.model] || item.model}<br/>
          <em>Weight:</em> {item.weight}
        </React.Fragment>
      )}
      onDelete={props.onDelete}
    />
  )
}

function ModelScorers(props) {
  return (
    <ComponentWithResources
      {...props}
      definition={{
        models: new URL(`models/?project_id=${props.currentProject.id}`, props.apiUrls.qsarRoot),
      }}
    >
      {(isLoaded, data) => isLoaded ? (
        <React.Fragment>
          <h1>GenUI Model Scorers</h1>
          <ModelScorerForm
            models={data.models}
            onAdd={(payload) => props.onAdd(props.title, payload)}
          />
          <hr/>
          <ModelScorersList
            data={props.data}
            modelMap={Object.fromEntries(data.models.map(item => [item.id, item.name]))}
            onDelete={(item) => props.onDelete(props.title, item)}
          />
        </React.Fragment>
      ) : <div>Loading...</div>}
    </ComponentWithResources>
  )
}

export default function Predictors(props) {
  return (
    <ComponentWithObjects
      {...props}
      commitObjects={true}
      objectListURL={new URL('model-scorers/', props.apiUrls.reinventRoot)}
      emptyClassName="ModelScorers"
      render={(data, x, handleAdd, handleDelete) => (
        <ModelScorers
          {...props}
          title="ModelScorers"
          data={data.ModelScorers}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
      )}
    />
  )
}

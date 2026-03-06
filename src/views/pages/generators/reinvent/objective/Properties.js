import React from 'react';
import Form from "@rjsf/bootstrap-4";
import { ComponentWithObjects } from '../../../../../genui';
import { Button } from 'reactstrap';
import CardGrid from './CardGrid';

function PropertyScorerForm(props) {
  const schema = {
    type: "object",
    required: ["name", "property_name"],
    properties: {
      name: {type: "string", title: "Name", minLength: 1, default: ""},
      weight: {type: "number", title: "Weight", default: 1.0},
      property_name: {type: "string", title: "Property", minLength: 1, default: ""},
    }
  };

  return (
    <Form
      showErrorList={true}
      schema={schema}
      uiSchema={{}}
      onError={errors => {
        console.error("PropertyScorer form validation errors:", errors);
        alert("Form validation failed. Check console for details.");
      }}
      onSubmit={(data) => {
        const payload = data.formData;
        try {
          props.onAdd(payload);
        } catch (error) {
          console.error("Error calling onAdd:", error);
          alert(`Error: ${error.message}`);
        }
      }}
    >
      <Button type="submit" color="primary" size="lg">
        Create Property Scorer
      </Button>
    </Form>
  )
}

function PropertyScorersList(props) {
  return (
    <CardGrid
      data={props.data}
      itemDataComponent={({item}) => (
        <React.Fragment>
          <em>Property:</em> {item.property_name}<br/>
          <em>Weight:</em> {item.weight}
        </React.Fragment>
      )}
      onDelete={props.onDelete}
    />
  )
}

function PropertyScorers(props) {
  return (
    <React.Fragment>
      <h1>Property Scorers</h1>
      <PropertyScorerForm
        onAdd={(payload) => props.onAdd(props.title, payload)}
      />
      <hr/>
      <PropertyScorersList
        data={props.data}
        onDelete={(item) => props.onDelete(props.title, item)}
      />
    </React.Fragment>
  )
}

export default function Properties(props) {
  return (
    <ComponentWithObjects
      {...props}
      commitObjects={true}
      objectListURL={new URL('property-scorers/', props.apiUrls.reinventRoot)}
      emptyClassName="PropertyScorers"
      render={(data, x, handleAdd, handleDelete) => (
        <PropertyScorers
          {...props}
          title="PropertyScorers"
          data={data.PropertyScorers}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
      )}
    />
  )
}
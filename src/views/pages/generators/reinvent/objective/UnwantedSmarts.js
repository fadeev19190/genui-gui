import React from "react";
import Form from "@rjsf/bootstrap-4";
import { ComponentWithObjects } from '../../../../../genui';
import { Button } from 'reactstrap';
import CardGrid from './CardGrid';

function UnwantedSmartsForm(props) {
  const schema = {
    type: "object",
    required: ["name"],
    properties: {
      name: {type: "string", title: "Name", minLength: 1, default: ""},
      weight: {type: "number", title: "Weight", default: 1.0},
      enabled: {type: "boolean", title: "Enabled", enum: [true, false], default: true},
    }
  };

  return (
    <Form
      showErrorList={true}
      schema={schema}
      uiSchema={{ enabled: {"ui:widget": "select"} }}
      onError={errors => {
        console.error("UnwantedSmarts form validation errors:", errors);
        alert("Form validation failed. Check console for details.");
      }}
      onSubmit={(data) => {
        const payload = data.formData;
        try { props.onAdd(payload); } catch (error) { alert(`Error: ${error.message}`); }
      }}
    >
      <Button type="submit" color="primary" size="lg">
        Create Unwanted SMARTS
      </Button>
    </Form>
  )
}

function UnwantedSmartsList(props) {
  return (
    <CardGrid
      data={props.data}
      itemDataComponent={({item}) => (
        <React.Fragment>
          <em>Weight:</em> {item.weight}<br/>
          <em>Enabled:</em> {String(item.enabled)}
        </React.Fragment>
      )}
      onDelete={props.onDelete}
    />
  )
}

function UnwantedSmartsScorers(props) {
  return (
    <React.Fragment>
      <h1>Unwanted SMARTS</h1>
      <UnwantedSmartsForm onAdd={(payload) => props.onAdd(props.title, payload)} />
      <hr/>
      <UnwantedSmartsList
        data={props.data}
        onDelete={(item) => props.onDelete(props.title, item)}
      />
    </React.Fragment>
  )
}

export default function UnwantedSmarts(props) {
  return (
    <ComponentWithObjects
      {...props}
      commitObjects={true}
      objectListURL={new URL('unwanted-smarts/', props.apiUrls.reinventRoot)}
      emptyClassName="UnwantedSmartsScorers"
      render={(data, x, handleAdd, handleDelete) => (
        <UnwantedSmartsScorers
          {...props}
          title="UnwantedSmartsScorers"
          data={data.UnwantedSmartsScorers}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
      )}
    />
  )
}

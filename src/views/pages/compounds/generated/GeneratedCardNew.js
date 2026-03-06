import React from 'react';
import * as Yup from 'yup';
import { CardBody, CardHeader, FormGroup, Input, Label } from 'reactstrap';
import { Field } from 'formik';
import { FieldErrorMessage, ComponentWithObjects, GenericNewMolSetCard } from '../../../../genui';

function ExtraFormFields(props) {
  // Check if selected generator is a Reinvent generator
  const selectedGenerator = props.generators.find(g => g.id === parseInt(props.formik?.values?.source));
  const isReinvent = selectedGenerator && selectedGenerator.className === 'Reinvent';

  return (
    <React.Fragment>

      <FormGroup>
        <Label htmlFor="source">Generator</Label>
        <Field name="source" as={Input} type="select">
          {
            props.generators.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)
          }
        </Field>
        <FieldErrorMessage name="source"/>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="nSamples">Number of compounds to generate</Label>
        <Field name="nSamples" as={Input} type="number"/>
        <FieldErrorMessage name="nSamples"/>
      </FormGroup>

      {isReinvent && (
        <FormGroup>
          <Label htmlFor="minScore">Minimum Score Threshold (optional)</Label>
          <Field name="minScore" as={Input} type="number" step="0.01" placeholder="e.g., 0.5" />
          <small className="form-text text-muted">
            Only include molecules with score ≥ this value. Leave empty to include all molecules.
            <br />
            <strong>Note:</strong> If the threshold is too high and no molecules meet the criteria,
            the task will fail with an error showing the available score range. Start with a lower threshold (e.g., 0.5-0.7) and adjust based on the results.
          </small>
          <FieldErrorMessage name="minScore"/>
        </FormGroup>
      )}
    </React.Fragment>
  )
}

function NoGeneratorsCard(props) {
  return (
    <React.Fragment>
      <CardHeader>No Generators Available</CardHeader>
      <CardBody>
        There are currently no generators available. You have to create one first.
      </CardBody>
    </React.Fragment>
  )
}

function GeneratedCardNew(props) {

  const extraInitVals = {
    source : undefined,
    nSamples : 100,
    minScore : undefined
  };

  const extraValidSchemas = {
    source: Yup.number().integer().positive("Source generator ID has to be a positive number.").required('Source generator ID is required.'),
    nSamples: Yup.number().min(1, 'Required number of generated compounds must be at least 1.').required('You must provide the number of samples.'),
    minScore: Yup.number().min(0, 'Score must be non-negative.').max(1, 'Score must be between 0 and 1.').nullable()
  };

  return (
    <ComponentWithObjects
      {...props}
      objectListURL={new URL('all/', props.apiUrls.generatorsRoot)}
      emptyClassName="Generator"
      render={
        (generators) => {
          let flattened = [];
          Object.keys(generators).forEach(key => {
            flattened = flattened.concat(generators[key]);
          });
          extraInitVals.source = flattened.length > 0 ? flattened[0].id : undefined;
          return (
            flattened.length > 0 ? <GenericNewMolSetCard
              {...props}
              generators={flattened}
              cardHeader="Generate Compounds"
              extraFormInitVals={extraInitVals}
              extraFormValidSchemas={extraValidSchemas}
              additionalFieldsComponent={ExtraFormFields}
            /> : <NoGeneratorsCard/>
          )
        }
      }
    />
  )
}

export default GeneratedCardNew;
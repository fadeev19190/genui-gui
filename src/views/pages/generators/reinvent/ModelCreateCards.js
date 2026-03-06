import React from "react"
import {
  CardBody,
  CardHeader,
  Col,
  FormGroup,
  FormText,
  Input,
  Label,
  Tooltip,
} from 'reactstrap';
import { Field } from 'formik';
import { FileUpload, ComponentWithResources, FieldErrorMessage, FormikModelUploadForm, ModelCardNew } from '../../../../genui';
import * as Yup from 'yup';

// Tooltip helper component
function ParameterTooltip(props) {
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const tooltipId = `tooltip-${props.id}`;

  return (
    <>
      <span id={tooltipId} style={{ cursor: 'pointer', marginLeft: '0.5rem', color: '#0056b3', fontWeight: 'bold' }}>
        ?
      </span>
      <Tooltip placement="right" isOpen={tooltipOpen} target={tooltipId} toggle={() => setTooltipOpen(!tooltipOpen)}>
        {props.text}
      </Tooltip>
    </>
  );
}

function ReinventNetValidationFields(props) {
  const validationStrategyPrefix = props.validationStrategyPrefix;

  return (
    <React.Fragment>
      <FormGroup row>
        <Label htmlFor={`${validationStrategyPrefix}.validSetSize`} sm={4}>
          Validation Set Size
          <ParameterTooltip
            id="valid-set-size-help"
            text="Maximum number of molecules to use for validation. Set to 0 to use all available molecules. Validation data is used to monitor model performance during training and prevent overfitting."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${validationStrategyPrefix}.validSetSize`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${validationStrategyPrefix}.validSetSize`}/>

      <FormGroup row>
        <Label htmlFor={`${validationStrategyPrefix}.split_method`} sm={4}>
          Split Method
          <ParameterTooltip
            id="split-method-help"
            text="How to divide molecules into training and validation sets. 'random': randomly split the data. 'scaffold': group by molecular scaffold to ensure similar structures are kept together. 'temporal': split by date if available."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${validationStrategyPrefix}.split_method`} as={Input} type="select">
            <option value="random">random</option>
            <option value="scaffold">scaffold</option>
            <option value="temporal">temporal</option>
          </Field>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${validationStrategyPrefix}.split_method`}/>

      <FormGroup row>
        <Label htmlFor={`${validationStrategyPrefix}.valid_fraction`} sm={4}>
          Validation Fraction
          <ParameterTooltip
            id="valid-fraction-help"
            text="Fraction of data to use for validation (0.0 to 0.9). For example, 0.1 means 10% of data goes to validation, 90% to training. Only used if Validation Set Size is 0."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${validationStrategyPrefix}.valid_fraction`} as={Input} type="number" step="0.01"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${validationStrategyPrefix}.valid_fraction`}/>

      <FormGroup row>
        <Label htmlFor={`${validationStrategyPrefix}.random_seed`} sm={4}>
          Random Seed
          <ParameterTooltip
            id="random-seed-help"
            text="Random seed for reproducibility. Use the same seed to get the same train/validation split every time. Change the seed to try different splits."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${validationStrategyPrefix}.random_seed`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${validationStrategyPrefix}.random_seed`}/>

      <FormGroup row>
        <Label htmlFor={`${validationStrategyPrefix}.temporal_cutoff`} sm={4}>
          Temporal Cutoff
          <ParameterTooltip
            id="temporal-cutoff-help"
            text="Date cutoff for temporal splitting (format: YYYY-MM-DD). Molecules added before this date go to training, after go to validation. Only used with 'temporal' split method."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${validationStrategyPrefix}.temporal_cutoff`} as={Input} type="text" placeholder="YYYY-MM-DD"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${validationStrategyPrefix}.temporal_cutoff`}/>
    </React.Fragment>
  )
}

function ReinventAgentValidationFields(props) {
  const validationStrategyPrefix = props.validationStrategyPrefix;

  return (
    <React.Fragment>
      <FormGroup row>
        <Label htmlFor={`${validationStrategyPrefix}.validSetSize`} sm={4}>Validation Set Size</Label>
        <Col sm={8}>
          <Field name={`${validationStrategyPrefix}.validSetSize`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${validationStrategyPrefix}.validSetSize`}/>
    </React.Fragment>
  )
}

function ReinventNetTrainingFields(props) {
  const trainingStrategyPrefix = props.trainingStrategyPrefix;

  return (
    <React.Fragment>
      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.epochs`} sm={4}>
          Epochs
          <ParameterTooltip
            id="epochs-help"
            text="Number of complete passes through the training dataset. Start with 10-20 for testing, 50-100 for production. Higher values train longer but may overfit."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.epochs`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.epochs`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.batch_size`} sm={4}>
          Batch Size
          <ParameterTooltip
            id="batch-size-help"
            text="Number of molecules processed in each training step. Larger values (64-128) train faster but need more memory. Smaller values (16-32) use less memory but train slower."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.batch_size`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.batch_size`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.sample_batch_size`} sm={4}>
          Sample Batch Size
          <ParameterTooltip
            id="sample-batch-help"
            text="Number of molecules sampled during training for validation purposes. Typically 100-500. Higher values give better validation estimates but take longer."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.sample_batch_size`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.sample_batch_size`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.save_every_n_epochs`} sm={4}>
          Save Every N Epochs
          <ParameterTooltip
            id="save-epochs-help"
            text="How frequently to save model checkpoints during training. Value of 1 saves after each epoch. Use higher values (5-10) to save disk space, but you'll have fewer checkpoints to choose from."
          />
        </Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.save_every_n_epochs`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.save_every_n_epochs`}/>
    </React.Fragment>
  )
}

function ReinventNetExtraFields(props) {
  return (
    <React.Fragment>
      <FormGroup>
        <Label htmlFor="molset">SMILES Dataset</Label>
        <Field name="molset" as={Input} type="select">
          {
            props.molsets.map((molset) => <option key={molset.id} value={molset.id}>{molset.name}</option>)
          }
        </Field>
      </FormGroup>
      <FieldErrorMessage name="molset"/>

      <FormGroup>
        <Label htmlFor="parent">Parent Network</Label>
        <Field name="parent" as={Input} type="select">
          <option key="empty-parent" value=''>---</option>
          {
            props.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)
          }
        </Field>
      </FormGroup>
      <FieldErrorMessage name="parent"/>
    </React.Fragment>
  )
}

function InfoCard(props) {
  return (
    <React.Fragment>
      <CardHeader>{props.title}</CardHeader>
      <CardBody className="scrollable">
        {props.text}
      </CardBody>
    </React.Fragment>
  )
}

export class ReinventNetCreateCard extends React.Component {

  render() {
    let molsets = [];
    Object.keys(this.props.compoundSets).forEach(
      (key) => molsets = molsets.concat(this.props.compoundSets[key])
    );

    if (molsets.length < 1) {
      return <InfoCard title="No Compound Sets" text="You need to create a compound set before training a Reinvent network."/>
    }

    const validationStrategyInit = {
      validSetSize: 10000,
      split_method: "random",
      valid_fraction: 0.1,
      random_seed: 1337,
      temporal_cutoff: "",
    };
    const trainingStrategyInit = {
      epochs: 10,
      batch_size: 64,
      sample_batch_size: 100,
      save_every_n_epochs: 1,
    }
    const extraParamInit = {
      parent: this.props.models.length > 0 ? this.props.models[this.props.models.length - 1].id : undefined,
      molset: molsets[0].id,
    };

    const validationStrategySchema = {
      validSetSize: Yup.number().integer().min(0, 'Validation set size must be positive or zero.'),
      split_method: Yup.string().required('Split method is required.'),
      valid_fraction: Yup.number().min(0).max(0.9, 'Validation fraction must be <= 0.9.'),
      random_seed: Yup.number().integer(),
      temporal_cutoff: Yup.string(),
    };
    const trainingStrategySchema = {
      epochs: Yup.number().integer().min(1, 'Epochs must be at least 1.'),
      batch_size: Yup.number().integer().min(1, 'Batch size must be at least 1.'),
      sample_batch_size: Yup.number().integer().min(1, 'Sample batch size must be at least 1.'),
      save_every_n_epochs: Yup.number().integer().min(1, 'Save frequency must be at least 1.'),
    }
    const extraParamsSchema = {
      parent: Yup.number().integer().positive('Parent network ID must be a positive integer.'),
      molset: Yup.number().integer().positive('Molecule set ID must be a positive integer.').required('You need to supply a set of compounds to create the corpus from.')
    };

    return (
      <ModelCardNew
        {...this.props}
        molsets={molsets}
        validationStrategyInit={validationStrategyInit}
        trainingStrategyInit={trainingStrategyInit}
        extraParamsInit={extraParamInit}
        validationStrategySchema={validationStrategySchema}
        trainingStrategySchema={trainingStrategySchema}
        extraParamsSchema={extraParamsSchema}
        validationStrategyFields={ReinventNetValidationFields}
        trainingStrategyFields={ReinventNetTrainingFields}
        extraFields={ReinventNetExtraFields}
        disabledModelFormFields={['validationStrategy.metrics', 'trainingStrategy.mode']}
      />
    )
  }
}

function ReinventAgentTrainingFields(props) {
  const trainingStrategyPrefix = props.trainingStrategyPrefix;
  const learningTypes = props.learningStrategies && props.learningStrategies.length > 0
    ? props.learningStrategies
    : ["dap"];

  return (
    <React.Fragment>
      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.batch_size`} sm={4}>Batch Size</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.batch_size`} as={Input} type="number" step="1"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.batch_size`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.unique_sequences`} sm={4}>Unique Sequences</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.unique_sequences`} as={Input} type="select">
            <option value="true">true</option>
            <option value="false">false</option>
          </Field>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.unique_sequences`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.randomize_smiles`} sm={4}>Randomize SMILES</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.randomize_smiles`} as={Input} type="select">
            <option value="true">true</option>
            <option value="false">false</option>
          </Field>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.randomize_smiles`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.tb_isim`} sm={4}>TB iSIM</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.tb_isim`} as={Input} type="select">
            <option value="false">false</option>
            <option value="true">true</option>
          </Field>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.tb_isim`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.use_checkpoint`} sm={4}>Use Checkpoint</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.use_checkpoint`} as={Input} type="select">
            <option value="false">false</option>
            <option value="true">true</option>
          </Field>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.use_checkpoint`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.purge_memories`} sm={4}>Purge Memories</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.purge_memories`} as={Input} type="select">
            <option value="false">false</option>
            <option value="true">true</option>
          </Field>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.purge_memories`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.summary_csv_prefix`} sm={4}>Summary CSV Prefix</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.summary_csv_prefix`} as={Input} type="text"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.summary_csv_prefix`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.learning_type`} sm={4}>Learning Type</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.learning_type`} as={Input} type="select">
            {learningTypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Field>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.learning_type`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.sigma`} sm={4}>Sigma</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.sigma`} as={Input} type="number" step="0.01"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.sigma`}/>

      <FormGroup row>
        <Label htmlFor={`${trainingStrategyPrefix}.rate`} sm={4}>Rate</Label>
        <Col sm={8}>
          <Field name={`${trainingStrategyPrefix}.rate`} as={Input} type="number" step="0.00001"/>
        </Col>
      </FormGroup>
      <FieldErrorMessage name={`${trainingStrategyPrefix}.rate`}/>
    </React.Fragment>
  )
}

function ReinventAgentExtraFields(props) {
  return (
    <React.Fragment>
      <FormGroup>
        <Label htmlFor="environment">Environment</Label>
        <Field name="environment" as={Input} type="select">
          {
            props.environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)
          }
        </Field>
      </FormGroup>
      <FieldErrorMessage name="environment"/>

      <FormGroup>
        <Label htmlFor="exploitationNet">Exploitation Network</Label>
        <Field name="exploitationNet" as={Input} type="select">
          {
            props.networks.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)
          }
        </Field>
      </FormGroup>
      <FieldErrorMessage name="exploitationNet"/>

      <FormGroup>
        <Label htmlFor="explorationNet">Exploration Network</Label>
        <Field name="explorationNet" as={Input} type="select">
          {
            props.networks.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)
          }
        </Field>
      </FormGroup>
      <FieldErrorMessage name="explorationNet"/>
    </React.Fragment>
  )
}

function ReinventAgentCreateCardRenderer(props) {
  const infoTitle = "Reinvent Agent Unavailable";
  if (props.environments.length === 0) {
    return <InfoCard title={infoTitle} text="You have to create an environment for the agent before continuing. Go to the 'Objective Creator' tab to select and configure scoring functions and then add them to the environment in the 'Environment Creator'."/>
  }

  if (props.networks.length < 2) {
    return <InfoCard title={infoTitle} text="You have to create a Reinvent exploitation and exploration network before you can train the Reinvent agent."/>
  }

  const learningStrategies = props.learningStrategies && props.learningStrategies.length > 0
    ? props.learningStrategies
    : ["dap"];

  const trainingStrategyInit = {
    batch_size: 64,
    unique_sequences: true,
    randomize_smiles: true,
    tb_isim: false,
    use_checkpoint: false,
    purge_memories: false,
    summary_csv_prefix: "reinvent",
    learning_type: learningStrategies[0],
    sigma: 128.0,
    rate: 0.0001,
  }
  const trainingStrategySchema = {
    batch_size: Yup.number().integer().min(1, "Batch size must be at least 1."),
    unique_sequences: Yup.boolean(),
    randomize_smiles: Yup.boolean(),
    tb_isim: Yup.boolean(),
    use_checkpoint: Yup.boolean(),
    purge_memories: Yup.boolean(),
    summary_csv_prefix: Yup.string().required("Summary prefix is required."),
    learning_type: Yup.string().required("Learning type is required."),
    sigma: Yup.number().min(0, "Sigma must be positive or zero."),
    rate: Yup.number().min(0, "Rate must be positive or zero."),
  }

  const validationStrategyInit = {
    validSetSize: 512,
  };
  const validationStrategySchema = {
    validSetSize: Yup.number().integer().min(0, 'Validation set size must be positive or zero.'),
  };

  const extraParamInit = {
    environment: props.environments[0].id,
    exploitationNet: props.networks[props.networks.length - 1].id,
    explorationNet: props.networks[0].id,
  };

  const extraParamsSchema = {
    environment: Yup.number().integer().positive('A QSAR model for the environment must be specified as a positive integer ID.').required('You need to supply a QSAR model as the environment.'),
    exploitationNet: Yup.number().integer().positive('Exploitation network must be specified as a positive integer ID.').required('You need to supply an exploitation network.'),
    explorationNet: Yup.number().integer().positive('Exploration network must be specified as a positive integer ID.').required('You need to supply an exploration network.'),
  };

  return (
    <ModelCardNew
      {...props}
      environments={props.environments}
      networks={props.networks}
      learningStrategies={learningStrategies}
      trainingStrategyInit={trainingStrategyInit}
      trainingStrategySchema={trainingStrategySchema}
      trainingStrategyFields={ReinventAgentTrainingFields}
      validationStrategyInit={validationStrategyInit}
      validationStrategySchema={validationStrategySchema}
      validationStrategyFields={ReinventAgentValidationFields}
      extraParamsInit={extraParamInit}
      extraParamsSchema={extraParamsSchema}
      extraFields={ReinventAgentExtraFields}
      disabledModelFormFields={['validationStrategy.metrics', 'trainingStrategy.mode']}
    />
  )
}

export function ReinventAgentCreateCard (props) {
  return (
    <ComponentWithResources
      {...props}
      definition={{
          networks: props.netsUrl + `?project_id=${props.currentProject.id}`,
          learningStrategies: new URL('agent-training/learning-strategies/', props.apiUrls.reinventRoot)
      }}
    >
        {
            (loaded, data) => {
                if (loaded) {
                    return (
                        <ReinventAgentCreateCardRenderer
                            {...props}
                            learningStrategies={data.learningStrategies.strategies || []}
                            {...data}
                        />
                    )
                } else {
                    return <div>Fetching networks...</div>
                }
            }
        }
    </ComponentWithResources>
  )
}

function ExtraFields(props) {

  return (
    <React.Fragment>
      <FormGroup>
        <Label htmlFor="vocabulary">Vocabulary File</Label>
        <Field
          name="vocabulary"
          component={FileUpload}
        />
        <FormText color="muted">
          Vocabulary file. This should be a text file with '.txt'
          extension. It is automatically generated when a Reinvent
          network is trained.
        </FormText>
      </FormGroup>
      <FieldErrorMessage name="vocabulary"/>

      <Field name="vocabulary_note" as={Input} type="text" hidden/>
    </React.Fragment>
  )
}

export function ReinventNetFromFileCard(props) {
  const extraParamInit = {
    vocabulary: undefined,
    vocabulary_note: "Reinvent_voc",
  };

  const extraParamsSchema = {
    vocabulary: Yup.mixed().required('Vocabulary file must be specified.'),
    vocabulary_note: Yup.string().matches(/Reinvent_voc/).required('Vocabulary file note is required'),
  };

  return (
    <ModelCardNew
      {...props}
      form={FormikModelUploadForm}
      formNameSuffix="create-upload"
      omitAlgParams={true}
      omitValidation={true}
      enableFileUploads={true}
      extraParamsInit={extraParamInit}
      extraParamsSchema={extraParamsSchema}
      extraFields={ExtraFields}
    />)
}
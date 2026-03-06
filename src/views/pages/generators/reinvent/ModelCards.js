import React from "react"
import {ModelCard, ModelInfoTab, ModelPerformance, TaskAwareComponent, TaskBadgeGroup} from '../../../../genui';
import {ReinventAgentPerformanceTab} from "./tabs/Performance";
import TrainingLogViewer from "./TrainingLogViewer";

// Stable wrapper — created once per card instance, never re-renders from
// TabWidget's {…props} spread. Captures model/apiUrls at construction time
// and exposes a tasksRunning setter so the interval knows when to poll.
function makeStablePerformanceTab(model, apiUrls) {
  return class StablePerformanceTab extends React.Component {
    // The only thing allowed to change: whether a task is running.
    // We hold it in state so TrainingLogViewer re-renders only for this.
    constructor(props) {
      super(props);
      this.state = { tasksRunning: false };
    }

    // Called by ReinventNetCard after every TaskAwareComponent render.
    setTasksRunning(val) {
      if (this.state.tasksRunning !== val) {
        this.setState({ tasksRunning: val });
      }
    }

    // Block ALL external re-renders — TabWidget spreads new props every poll.
    shouldComponentUpdate(nextProps, nextState) {
      return nextState.tasksRunning !== this.state.tasksRunning;
    }

    render() {
      return (
        <TrainingLogViewer
          model={model}
          apiUrls={apiUrls}
          tasksRunning={this.state.tasksRunning}
        />
      );
    }
  };
}

export class ReinventNetCard extends React.Component {

  constructor(props) {
    super(props);
    // StablePerformanceTab is created ONCE — stable class reference.
    this._PerformanceTab = makeStablePerformanceTab(props.model, props.apiUrls);
    this._perfTabRef = React.createRef();

    // renderedComponent must be a STABLE reference — if it's a new arrow
    // function on every render(), TabWidget sees a new component type and
    // unmounts/remounts the TabPane, resetting all state and the chart.
    const PerformanceTab = this._PerformanceTab;
    const perfTabRef = this._perfTabRef;
    this._stableRenderedPerformance = (props) => <PerformanceTab ref={perfTabRef} />;

    this._tabs = [
      { title: "Info",        renderedComponent: ModelInfoTab },
      { title: "Performance", renderedComponent: this._stableRenderedPerformance },
    ];
  }

  render() {
    const model = this.props.model;
    const validationStrategy = model.validationStrategy;

    const trainingParams = [
      { name: "Training Set",  value: model.molset ? model.molset.name : "--" },
      { name: "Parent",        value: model.parent ? model.parent.name : "--" },
    ];
    const validationParams = validationStrategy ? [
      { name: "Validation Set Size", value: validationStrategy.validSetSize }
    ] : [];


    const tasksURL = new URL(`networks/${model.id}/tasks/all/`, this.props.apiUrls.reinventRoot);

    return (
      <TaskAwareComponent
        tasksURL={tasksURL}
        handleResponseErrors={this.props.handleResponseErrors || ((r) => r.json())}
        render={(taskState) => {
          // Push tasksRunning into the stable tab component via ref —
          // no prop recreation, no remount.
          if (this._perfTabRef.current) {
            this._perfTabRef.current.setTasksRunning(taskState.tasksRunning);
          }
          return (
            <ModelCard
              {...this.props}
              tabs={this._tabs}
              extraTrainingParams={trainingParams}
              extraValidationParams={validationParams}
              taskStatusHeader={
                <TaskBadgeGroup
                  tasks={taskState.tasks}
                  colorMap={taskState.tasksColorMap}
                />
              }
              tasksRunning={taskState.tasksRunning}
              tasksUpToDate={taskState.tasksUpToDate}
            />
          );
        }}
      />
    );
  }
}

export class ReinventAgentCard extends React.Component {

  render() {
    const model =  this.props.model;

    const trainingParams = [
      {
        name : "Environment",
        value : model.environment.name
      },
      {
        name : "Exploitation Network",
        value : model.exploitationNet.name
      },
      {
        name : "Exploration Network",
        value : model.explorationNet.name
      },
    ];

    const tabs = [
      {
        title : "Info",
        renderedComponent : ModelInfoTab
      },
      {
        title: "Performance"
        , renderedComponent : (props) =>
          <ModelPerformance
            {...props}
            component={ReinventAgentPerformanceTab}
          />
      }
    ];

    // Wrap ModelCard with TaskAwareComponent to show task status
    const tasksURL = new URL(`agents/${model.id}/tasks/all/`, this.props.apiUrls.reinventRoot);

    return (
      <TaskAwareComponent
        tasksURL={tasksURL}
        handleResponseErrors={this.props.handleResponseErrors || ((r) => r.json())}
        render={(taskState, registerTaskUpdateAction) => (
          <ModelCard
            {...this.props}
            tabs={tabs}
            extraTrainingParams={trainingParams}
            taskStatusHeader={
              <TaskBadgeGroup
                tasks={taskState.tasks}
                colorMap={taskState.tasksColorMap}
              />
            }
            tasksRunning={taskState.tasksRunning}
            tasksUpToDate={taskState.tasksUpToDate}
          />
        )}
      />
    );
  }
}
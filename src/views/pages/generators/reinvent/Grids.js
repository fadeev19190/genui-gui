import React from "react";
import { ComponentWithResources, ModelsPage } from '../../../../genui';

class ReinventModelList extends React.Component {

    render() {
        return (
            <React.Fragment>
                <h1>{this.props.title}</h1>
                <hr/>
                <ModelsPage
                    {...this.props}
                    headerComponent={null}
                />
            </React.Fragment>
        )
    }
}

export function ReinventAgentGrid(props) {
    return (
        <div className={props.modelClass} id={props.modelClass}>
          <ComponentWithResources definition={
            {
              agentOptions: new URL('agents/', props.apiUrls.reinventRoot),
            }}
            method="OPTIONS"
          >
            {
              (isLoaded, data) => (
                isLoaded ? <ReinventModelList
                  {...props}
                  drexagentExplorers={data.agentOptions.actions.POST.trainingStrategy.children.explorer.choices}
                  cardSetup={{
                    h: {"md": 13, "sm": 13},
                    w: {"md": 1, "sm": 1},
                    minH: {"md": 3, "sm": 3},
                  }}
                /> : "Fetching agent options..."
              )
            }
          </ComponentWithResources>
        </div>
    )
}
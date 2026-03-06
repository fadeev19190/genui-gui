import React from "react";

class DrugEx extends React.Component {

  render() {
    if (!this.props.currentProject) {
      return <div>Loading...</div>
    }

    // const resources = {
    //   algorithmChoices : new URL('algorithms/', this.props.apiUrls.generatorsRoot),
    //   metrics: new URL('metrics/', this.props.apiUrls.generatorsRoot),
    //   environments: new URL(`environments/?project_id=${this.props.currentProject.id}`, this.props.apiUrls.drugexRoot),
    //   compoundSets: new URL(`all/?project_id=${this.props.currentProject.id}`, this.props.apiUrls.compoundSetsRoot),
    // };
    //
    // const tabs = [
    //   {
    //     title: "Model Designer",
    //     renderedComponent: ReinventPage
    //   },
    //   {
    //     title: "Objective Creator",
    //     renderedComponent: ObjectivePage
    //   },
    //   {
    //     title: "Environment Creator",
    //     renderedComponent: EnvironmentPage
    //   }
    // ]

    return (
        // <ComponentWithResources definition={resources}>
        //   {
        //     (allLoaded, resources) => (
        //         allLoaded ? (
        //           <TabWidget
        //             {...this.props}
        //             {...resources}
        //             tabs={tabs}
        //           />
        //         ) : <div>Loading...</div>
        //     )
        //   }
        // </ComponentWithResources>
        <div>Some text, I am pidoras , DrugEx.js</div>
    )
  }
}

export default DrugEx;
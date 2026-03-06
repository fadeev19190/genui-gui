import React from 'react';
import {GenericMolSetCard, MolsetActivitiesSummary, MolsInMolSetList, GenericInfo, EditMolSet} from '../../../../genui';
import GeneratedSetErrorDisplay from './GeneratedSetErrorDisplay';

function GeneratedCard(props) {
  const tabs = [
    {
      title : "Info",
      renderedComponent : GenericInfo,
    },
    {
      title : "Structures",
      renderedComponent: (props) => <MolsInMolSetList {...props} showInfo={true}/>,
    },
    {
      title: "Activities",
      renderedComponent: props => <MolsetActivitiesSummary {...props} selectable={false}/>
    },
    {
      title: "Edit",
      renderedComponent: props => <EditMolSet {...props}/>
    }
  ];

  // Custom error component mapping for task errors
  const errorClassToComponent = {
    "<class 'ValueError'>": GeneratedSetErrorDisplay,
    "builtins.ValueError": GeneratedSetErrorDisplay,
  };

  return (
    <GenericMolSetCard
      {...props}
      tabs={tabs}
      taskErrorClassToComponent={errorClassToComponent}
    />
  )
}

export default GeneratedCard;
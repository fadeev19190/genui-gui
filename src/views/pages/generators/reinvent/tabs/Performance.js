import React from "react";
import {DrExAgentScoresPlot, DrExLossPlot} from "./Plots";
import TrainingLogViewer from "../TrainingLogViewer";

export function ReinventAgentPerformanceTab(props) {
    const loss = props.getPerfValuesForMetric(props.performance, "ModelPerformanceReinvent", props.metrics.find(metric => metric.name === 'DrExLoss'));
    const errors = props.getPerfValuesForMetric(props.performance, "ModelPerformanceReinvent", props.metrics.find(metric => metric.name === 'SMILES_ER'));
    const uniqueness = props.getPerfValuesForMetric(props.performance, "ModelPerformanceReinvent", props.metrics.find(metric => metric.name === 'SMILES_UQR'));
    const desirability = props.getPerfValuesForMetric(props.performance, "ModelPerformanceReinvent", props.metrics.find(metric => metric.name === 'DrExDesire'));

    return (
        <div className="reinvent-agent-performance-plots">
            <DrExLossPlot losses={loss}/>
            <DrExAgentScoresPlot
              datasets={[
                {
                  title: "Desirability",
                  data: desirability,
                  color: "#36a2eb"
                },
                {
                  title: "Error Rate",
                  data: errors,
                  color: "#ff6384"
                },
                {
                  title: "Uniqueness",
                  data: uniqueness,
                  color: "#7fd280"
                }
              ]}
            />
        </div>
    )
}

export function ReinventNetworkPerformanceTab(props) {

    return (
        <div className="reinvent-net-performance-plots">
            {/* Training Log Viewer - shows current epoch, validation loss, warnings */}
            <TrainingLogViewer model={props.model} apiUrls={props.apiUrls} />
        </div>
    )
}

export function StagedLearningPerformanceTab(props) {
    return (
        <div className="staged-learning-performance">
            {/* Training Log Viewer - shows current epoch, validation loss, warnings */}
            <TrainingLogViewer model={props.model} apiUrls={props.apiUrls} />
        </div>
    )
}

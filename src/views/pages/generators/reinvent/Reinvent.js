import React from "react";
import { ComponentWithResources, TabWidget } from '../../../../genui';
import AboutPage from './AboutPage';
import ReinventPage from './ReinventPage';
import ObjectivePage from './objective/ObjectivePage';
import EnvironmentPage from './environment/EnvironmentPage';
import StagedLearningRouter from './runs/StagedLearningRouter';

class Reinvent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      activeTab: this.getActiveTabFromURL() || "About REINVENT"
    };
    this.refreshCounter = {};
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Reinvent component error:", error, errorInfo);
  }

  getActiveTabFromURL() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('reinvent_tab');
    if (fromUrl) return fromUrl;
    // Fallback: read from localStorage
    try {
      return localStorage.getItem('genui_reinvent_active_tab');
    } catch (e) {
      return null;
    }
  }

  setActiveTab(tabTitle) {
    // Update state
    this.setState({ activeTab: tabTitle });

    // Persist to localStorage so it survives full page reloads
    try {
      localStorage.setItem('genui_reinvent_active_tab', tabTitle);
    } catch (e) { /* ignore */ }

    // Update URL with tab parameter
    const params = new URLSearchParams(window.location.search);
    params.set('reinvent_tab', tabTitle);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newURL }, '', newURL);
  }

  // Method to signal that data has been created and other tabs should refresh
  triggerDataRefresh(category) {
    console.log(`Triggering refresh for category: ${category}`);
    this.refreshCounter[category] = (this.refreshCounter[category] || 0) + 1;
    // Force a re-render to pass the updated counter to child components
    this.forceUpdate();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", backgroundColor: "#f8d7da", borderRadius: "4px" }}>
          <h2>⚠️ Error Loading REINVENT</h2>
          <p>An error occurred while loading the REINVENT interface:</p>
          <pre style={{ backgroundColor: "#fff", padding: "1rem", borderRadius: "4px", overflow: "auto" }}>
            {this.state.error?.toString() || "Unknown error"}
          </pre>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="btn btn-primary">
            Try Again
          </button>
        </div>
      );
    }

    if (!this.props.currentProject) {
      return <div>Loading project...</div>
    }

    const resources = {
      algorithmChoices : new URL('algorithms/', this.props.apiUrls.generatorsRoot),
      metrics: new URL('metrics/', this.props.apiUrls.generatorsRoot),
      environments: new URL(`environments/?project_id=${this.props.currentProject.id}`, this.props.apiUrls.reinventRoot),
      compoundSets: new URL(`all/?project_id=${this.props.currentProject.id}`, this.props.apiUrls.compoundSetsRoot),
    };

    const tabs = [
      {
        title: "About REINVENT",
        renderedComponent: AboutPage
      },
      {
        title: "Model Designer",
        renderedComponent: ReinventPage
      },
      {
        title: "Scoring Components",
        renderedComponent: ObjectivePage
      },
      {
        title: "Environment Creator",
        renderedComponent: EnvironmentPage
      },
      {
        title: "Staged Learning",
        renderedComponent: StagedLearningRouter
      }
    ]

    return (
        <ComponentWithResources definition={resources}>
          {
            (allLoaded, resources) => (
                allLoaded ? (
                  <TabWidget
                    {...this.props}
                    {...resources}
                    tabs={tabs}
                    activeTab={this.state.activeTab}
                    onTabChange={(tabTitle) => this.setActiveTab(tabTitle)}
                    reinventRefreshCounter={this.refreshCounter}
                    triggerDataRefresh={(category) => this.triggerDataRefresh(category)}
                  />
                ) : <div>Loading REINVENT resources...</div>
            )
          }
        </ComponentWithResources>
    )
  }
}

export default Reinvent;
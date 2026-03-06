import React from "react";
import { CardHeader, Alert } from 'reactstrap';
import NewMolSetFormRenderer from './NewMolSetFormRenderer';

class GenericNewMolSetCard extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            error: null
        };
    }

    postFormData = (data, isMultiPart) => {
        // Clear any previous errors
        this.setState({ error: null });

        fetch(
          this.props.molsetListUrl
          , {
            method: 'POST'
            , body: isMultiPart ? data : JSON.stringify(data)
            , headers: isMultiPart ?
                    undefined :
                    {
                        'Content-Type': 'application/json'
                    },
            credentials: "include",
          }
        )
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.detail || err.message || 'Failed to create compound set');
                });
            }
            return response.json();
        })
        .then(data => {
            // console.log(data);
            this.props.handleCreateNew(this.props.currentMolsetClass, data)
        })
        .catch(e => {
            console.error('Error creating compound set:', e);
            this.setState({
                error: e.message || 'An error occurred while creating the compound set. Please check your parameters and try again.'
            });
        });
    };

  render() {
    return (
      <React.Fragment>
        <CardHeader>{this.props.cardHeader}</CardHeader>
        {this.state.error && (
          <Alert color="danger" className="m-3">
            <strong>Error:</strong> {this.state.error}
          </Alert>
        )}
        <NewMolSetFormRenderer {...this.props} handleCreate={this.postFormData}/>
      </React.Fragment>
    )
  }
}

export default GenericNewMolSetCard;
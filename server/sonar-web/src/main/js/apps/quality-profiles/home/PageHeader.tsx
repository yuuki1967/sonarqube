/*
 * SonarQube
 * Copyright (C) 2009-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as React from 'react';
import { Link } from 'react-router';
import CreateProfileForm from './CreateProfileForm';
import RestoreProfileForm from './RestoreProfileForm';
import { Profile } from '../types';
import { getProfilePath } from '../utils';
import { Actions } from '../../../api/quality-profiles';
import { Button } from '../../../components/ui/buttons';
import { translate } from '../../../helpers/l10n';
import { withRouter, Router } from '../../../components/hoc/withRouter';

interface Props {
  actions: Actions;
  languages: Array<{ key: string; name: string }>;
  organization: string | null;
  profiles: Profile[];
  router: Pick<Router, 'push'>;
  updateProfiles: () => Promise<void>;
}

interface State {
  createFormOpen: boolean;
  restoreFormOpen: boolean;
}

class PageHeader extends React.PureComponent<Props, State> {
  state: State = {
    createFormOpen: false,
    restoreFormOpen: false
  };

  handleCreateClick = () => {
    this.setState({ createFormOpen: true });
  };

  handleCreate = (profile: Profile) => {
    this.props.updateProfiles().then(
      () => {
        this.props.router.push(
          getProfilePath(profile.name, profile.language, this.props.organization)
        );
      },
      () => {}
    );
  };

  closeCreateForm = () => {
    this.setState({ createFormOpen: false });
  };

  handleRestoreClick = () => {
    this.setState({ restoreFormOpen: true });
  };

  closeRestoreForm = () => {
    this.setState({ restoreFormOpen: false });
  };

  render() {
    return (
      <header className="page-header">
        <h1 className="page-title">{translate('quality_profiles.page')}</h1>

        {this.props.actions.create && (
          <div className="page-actions">
            <Button id="quality-profiles-create" onClick={this.handleCreateClick}>
              {translate('create')}
            </Button>
            <Button
              className="little-spacer-left"
              id="quality-profiles-restore"
              onClick={this.handleRestoreClick}>
              {translate('restore')}
            </Button>
          </div>
        )}

        <div className="page-description markdown">
          {translate('quality_profiles.intro1')}
          <br />
          {translate('quality_profiles.intro2')}
          <Link
            className="spacer-left"
            target="_blank"
            to={{
              pathname: '/documentation/instance-administration/quality-profiles/'
            }}>
            {translate('learn_more')}
          </Link>
        </div>

        {this.state.restoreFormOpen && (
          <RestoreProfileForm
            onClose={this.closeRestoreForm}
            onRestore={this.props.updateProfiles}
            organization={this.props.organization}
          />
        )}

        {this.state.createFormOpen && (
          <CreateProfileForm
            languages={this.props.languages}
            onClose={this.closeCreateForm}
            onCreate={this.handleCreate}
            organization={this.props.organization}
            profiles={this.props.profiles}
          />
        )}
      </header>
    );
  }
}

export default withRouter(PageHeader);

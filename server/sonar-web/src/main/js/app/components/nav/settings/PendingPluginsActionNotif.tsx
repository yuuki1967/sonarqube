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
import { FormattedMessage } from 'react-intl';
import InstanceMessage from '../../../../components/common/InstanceMessage';
import RestartForm from '../../../../components/common/RestartForm';
import { cancelPendingPlugins, PluginPendingResult } from '../../../../api/plugins';
import { Button } from '../../../../components/ui/buttons';
import { translate } from '../../../../helpers/l10n';
import { Alert } from '../../../../components/ui/Alert';

interface Props {
  pending: PluginPendingResult;
  refreshPending: () => void;
}

interface State {
  openRestart: boolean;
}

export default class PendingPluginsActionNotif extends React.PureComponent<Props, State> {
  state: State = { openRestart: false };

  handleOpenRestart = () => {
    this.setState({ openRestart: true });
  };

  hanleCloseRestart = () => {
    this.setState({ openRestart: false });
  };

  handleRevert = () => {
    cancelPendingPlugins().then(this.props.refreshPending, () => {});
  };

  render() {
    const { installing, updating, removing } = this.props.pending;
    const hasPendingActions = installing.length || updating.length || removing.length;
    if (!hasPendingActions) {
      return null;
    }

    return (
      <Alert className="js-pending" display="banner" variant="info">
        <div className="display-flex-center">
          <span className="little-spacer-right">
            <InstanceMessage message={translate('marketplace.instance_needs_to_be_restarted_to')} />
          </span>
          {[
            { length: installing.length, msg: 'marketplace.install_x_plugins' },
            { length: updating.length, msg: 'marketplace.update_x_plugins' },
            { length: removing.length, msg: 'marketplace.uninstall_x_plugins' }
          ]
            .filter(({ length }) => length > 0)
            .map(({ length, msg }, idx) => (
              <span key={msg}>
                {idx > 0 && '; '}
                <FormattedMessage
                  defaultMessage={translate(msg)}
                  id={msg}
                  values={{ nb: <strong>{length}</strong> }}
                />
              </span>
            ))}
          <Button className="spacer-left js-restart" onClick={this.handleOpenRestart}>
            {translate('marketplace.restart')}
          </Button>
          <Button className="spacer-left js-cancel-all button-red" onClick={this.handleRevert}>
            {translate('marketplace.revert')}
          </Button>
          {this.state.openRestart && <RestartForm onClose={this.hanleCloseRestart} />}
        </div>
      </Alert>
    );
  }
}

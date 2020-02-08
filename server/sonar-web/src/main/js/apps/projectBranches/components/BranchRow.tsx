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
import * as classNames from 'classnames';
import DeleteBranchModal from './DeleteBranchModal';
import LeakPeriodForm from './LeakPeriodForm';
import RenameBranchModal from './RenameBranchModal';
import BranchStatus from '../../../components/common/BranchStatus';
import BranchIcon from '../../../components/icons-components/BranchIcon';
import {
  isShortLivingBranch,
  isLongLivingBranch,
  isMainBranch,
  getBranchLikeDisplayName,
  isPullRequest
} from '../../../helpers/branches';
import { translate } from '../../../helpers/l10n';
import DateFromNow from '../../../components/intl/DateFromNow';
import ActionsDropdown, {
  ActionsDropdownItem,
  ActionsDropdownDivider
} from '../../../components/controls/ActionsDropdown';

interface Props {
  branchLike: T.BranchLike;
  component: string;
  isOrphan?: boolean;
  onChange: () => void;
}

interface State {
  changingLeak: boolean;
  deleting: boolean;
  renaming: boolean;
}

export default class BranchRow extends React.PureComponent<Props, State> {
  mounted = false;
  state: State = { changingLeak: false, deleting: false, renaming: false };

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  handleDeleteClick = () => {
    this.setState({ deleting: true });
  };

  handleDeletingStop = () => {
    this.setState({ deleting: false });
  };

  handleRenameClick = () => {
    this.setState({ renaming: true });
  };

  handleChange = () => {
    if (this.mounted) {
      this.setState({ deleting: false, renaming: false });
      this.props.onChange();
    }
  };

  handleRenamingStop = () => {
    this.setState({ renaming: false });
  };

  handleChangeLeakClick = () => {
    this.setState({ changingLeak: true });
  };

  handleChangingLeakStop = () => {
    if (this.mounted) {
      this.setState({ changingLeak: false });
    }
  };

  renderActions() {
    const { branchLike, component } = this.props;
    return (
      <td className="thin nowrap text-right">
        <ActionsDropdown className="ig-spacer-left">
          {isLongLivingBranch(branchLike) && (
            <ActionsDropdownItem
              className="js-change-leak-period"
              onClick={this.handleChangeLeakClick}>
              {translate('branches.set_new_code_period')}
            </ActionsDropdownItem>
          )}
          {isLongLivingBranch(branchLike) && <ActionsDropdownDivider />}
          {isMainBranch(branchLike) ? (
            <ActionsDropdownItem className="js-rename" onClick={this.handleRenameClick}>
              {translate('branches.rename')}
            </ActionsDropdownItem>
          ) : (
            <ActionsDropdownItem
              className="js-delete"
              destructive={true}
              onClick={this.handleDeleteClick}>
              {translate(
                isPullRequest(branchLike) ? 'branches.pull_request.delete' : 'branches.delete'
              )}
            </ActionsDropdownItem>
          )}
        </ActionsDropdown>

        {this.state.deleting && (
          <DeleteBranchModal
            branchLike={branchLike}
            component={component}
            onClose={this.handleDeletingStop}
            onDelete={this.handleChange}
          />
        )}

        {this.state.renaming &&
          isMainBranch(branchLike) && (
            <RenameBranchModal
              branch={branchLike}
              component={component}
              onClose={this.handleRenamingStop}
              onRename={this.handleChange}
            />
          )}

        {this.state.changingLeak &&
          isLongLivingBranch(branchLike) && (
            <LeakPeriodForm
              branch={branchLike.name}
              onClose={this.handleChangingLeakStop}
              project={component}
            />
          )}
      </td>
    );
  }

  render() {
    const { branchLike, isOrphan } = this.props;
    const indented = (isShortLivingBranch(branchLike) || isPullRequest(branchLike)) && !isOrphan;

    return (
      <tr>
        <td>
          <BranchIcon
            branchLike={branchLike}
            className={classNames('little-spacer-right', { 'big-spacer-left': indented })}
          />
          {getBranchLikeDisplayName(branchLike)}
          {isMainBranch(branchLike) && (
            <div className="outline-badge spacer-left">{translate('branches.main_branch')}</div>
          )}
        </td>
        <td className="thin nowrap">
          <BranchStatus branchLike={branchLike} />
        </td>
        <td className="thin nowrap text-right big-spacer-left">
          {branchLike.analysisDate && <DateFromNow date={branchLike.analysisDate} />}
        </td>
        {this.renderActions()}
      </tr>
    );
  }
}

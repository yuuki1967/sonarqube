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
import { Link } from 'react-router';
import * as classNames from 'classnames';
import DropdownIcon from '../../../components/icons-components/DropdownIcon';
import Level from '../../../components/ui/Level';
import ProjectEventIcon from '../../../components/icons-components/ProjectEventIcon';
import { ResetButtonLink } from '../../../components/ui/buttons';
import { translate } from '../../../helpers/l10n';
import { getProjectUrl } from '../../../helpers/urls';

export type RichQualityGateEvent = T.AnalysisEvent & Required<Pick<T.AnalysisEvent, 'qualityGate'>>;

export function isRichQualityGateEvent(event: T.AnalysisEvent): event is RichQualityGateEvent {
  return event.category === 'QUALITY_GATE' && event.qualityGate !== undefined;
}

interface Props {
  event: RichQualityGateEvent;
}

interface State {
  expanded: boolean;
}

export class RichQualityGateEventInner extends React.PureComponent<Props, State> {
  state: State = { expanded: false };

  stopPropagation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  toggleProjectsList = () => {
    this.setState(state => ({ expanded: !state.expanded }));
  };

  render() {
    const { event } = this.props;
    const { expanded } = this.state;
    return (
      <div className="project-activity-event-inner">
        <div className="project-activity-event-inner-main">
          <ProjectEventIcon
            className={classNames(
              'project-activity-event-icon',
              'little-spacer-right',
              event.category
            )}
          />

          <div className="project-activity-event-inner-text flex-1">
            <span className="note little-spacer-right">
              {translate('event.category', event.category)}:
            </span>
            {event.qualityGate.stillFailing ? (
              <FormattedMessage
                defaultMessage={translate('event.quality_gate.still_x')}
                id="event.quality_gate.still_x"
                values={{ status: <Level level={event.qualityGate.status} small={true} /> }}
              />
            ) : (
              <Level level={event.qualityGate.status} small={true} />
            )}
          </div>

          {event.qualityGate.failing.length > 0 && (
            <ResetButtonLink
              className="project-activity-event-inner-more-link"
              onClick={this.toggleProjectsList}
              stopPropagation={true}>
              {expanded ? translate('hide') : translate('more')}
              <DropdownIcon className="little-spacer-left" turned={expanded} />
            </ResetButtonLink>
          )}
        </div>

        {expanded && (
          <ul className="project-activity-event-inner-more-content">
            {event.qualityGate.failing.map(project => (
              <li className="display-flex-center little-spacer-top" key={project.key}>
                <Level
                  className="little-spacer-right"
                  level={event.qualityGate.status}
                  small={true}
                />
                <div className="flex-1 text-ellipsis">
                  <Link
                    onClick={this.stopPropagation}
                    title={project.name}
                    to={getProjectUrl(project.key, project.branch)}>
                    {project.name}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

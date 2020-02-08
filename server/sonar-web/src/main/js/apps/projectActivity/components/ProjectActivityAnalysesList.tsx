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
import { throttle } from 'lodash';
import ProjectActivityAnalysis from './ProjectActivityAnalysis';
import DateFormatter from '../../../components/intl/DateFormatter';
import Tooltip from '../../../components/controls/Tooltip';
import { translate } from '../../../helpers/l10n';
import { toShortNotSoISOString } from '../../../helpers/dates';
import {
  activityQueryChanged,
  getAnalysesByVersionByDay,
  selectedDateQueryChanged,
  Query,
  ParsedAnalysis
} from '../utils';

interface Props {
  addCustomEvent: (analysis: string, name: string, category?: string) => Promise<void>;
  addVersion: (analysis: string, version: string) => Promise<void>;
  analyses: ParsedAnalysis[];
  analysesLoading: boolean;
  canAdmin?: boolean;
  canDeleteAnalyses?: boolean;
  changeEvent: (event: string, name: string) => Promise<void>;
  className?: string;
  deleteAnalysis: (analysis: string) => Promise<void>;
  deleteEvent: (analysis: string, event: string) => Promise<void>;
  initializing: boolean;
  project: { qualifier: string };
  query: Query;
  updateQuery: (changes: Partial<Query>) => void;
}

export default class ProjectActivityAnalysesList extends React.PureComponent<Props> {
  analyses?: HTMLCollectionOf<HTMLElement>;
  badges?: HTMLCollectionOf<HTMLElement>;
  scrollContainer?: HTMLElement | null;

  constructor(props: Props) {
    super(props);
    this.handleScroll = throttle(this.handleScroll, 20);
  }

  componentDidMount() {
    this.badges = document.getElementsByClassName(
      'project-activity-version-badge'
    ) as HTMLCollectionOf<HTMLElement>;
    this.analyses = document.getElementsByClassName(
      'project-activity-analysis'
    ) as HTMLCollectionOf<HTMLElement>;
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.scrollContainer) {
      return;
    }
    if (
      this.props.query.selectedDate &&
      (selectedDateQueryChanged(prevProps.query, this.props.query) ||
        prevProps.analyses !== this.props.analyses)
    ) {
      this.scrollToDate(this.props.query.selectedDate);
    } else if (activityQueryChanged(prevProps.query, this.props.query)) {
      this.resetScrollTop(0, true);
    }
  }

  handleScroll = () => this.updateStickyBadges(true);

  resetScrollTop = (newScrollTop: number, forceBadgeAlignement?: boolean) => {
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = newScrollTop;
    }
    if (this.badges) {
      for (let i = 1; i < this.badges.length; i++) {
        this.badges[i].removeAttribute('originOffsetTop');
        this.badges[i].classList.remove('sticky');
      }
    }
    this.updateStickyBadges(forceBadgeAlignement);
  };

  scrollToDate = (targetDate?: Date) => {
    if (!this.scrollContainer || !targetDate || !this.analyses) {
      return;
    }
    const date = targetDate.valueOf();
    for (let i = 1; i < this.analyses.length; i++) {
      if (Number(this.analyses[i].getAttribute('data-date')) === date) {
        const containerHeight = this.scrollContainer.offsetHeight - 100;
        const scrollDiff = Math.abs(this.scrollContainer.scrollTop - this.analyses[i].offsetTop);
        // Center only the extremities and the ones outside of the container
        if (scrollDiff > containerHeight || scrollDiff < 100) {
          this.resetScrollTop(this.analyses[i].offsetTop - containerHeight / 2);
        }
        break;
      }
    }
  };

  updateStickyBadges = (forceBadgeAlignement?: boolean) => {
    if (!this.scrollContainer || !this.badges) {
      return;
    }

    const { scrollTop } = this.scrollContainer;
    if (scrollTop == null) {
      return;
    }

    let newScrollTop;
    for (let i = 1; i < this.badges.length; i++) {
      const badge = this.badges[i];
      let originOffsetTop = badge.getAttribute('originOffsetTop');
      if (originOffsetTop == null) {
        // Set the originOffsetTop attribute, to avoid using getBoundingClientRect
        originOffsetTop = String(badge.offsetTop);
        badge.setAttribute('originOffsetTop', originOffsetTop);
      }
      if (Number(originOffsetTop) < scrollTop + 18 + i * 2) {
        if (forceBadgeAlignement && !badge.classList.contains('sticky')) {
          newScrollTop = originOffsetTop;
        }
        badge.classList.add('sticky');
      } else {
        badge.classList.remove('sticky');
      }
    }

    if (forceBadgeAlignement && newScrollTop != null) {
      this.scrollContainer.scrollTop = Number(newScrollTop) - 6;
    }
  };

  updateSelectedDate = (date: Date) => {
    this.props.updateQuery({ selectedDate: date });
  };

  render() {
    const byVersionByDay = getAnalysesByVersionByDay(this.props.analyses, this.props.query);
    const hasFilteredData =
      byVersionByDay.length > 1 ||
      (byVersionByDay.length === 1 && Object.keys(byVersionByDay[0].byDay).length > 0);
    if (this.props.analyses.length === 0 || !hasFilteredData) {
      return (
        <div className={this.props.className}>
          {this.props.initializing ? (
            <div className="text-center">
              <i className="spinner" />
            </div>
          ) : (
            <span className="note">{translate('no_results')}</span>
          )}
        </div>
      );
    }

    const firstAnalysisKey = this.props.analyses[0].key;
    const selectedDate = this.props.query.selectedDate
      ? this.props.query.selectedDate.valueOf()
      : null;

    return (
      <ul
        className={classNames('project-activity-versions-list', this.props.className)}
        onScroll={this.handleScroll}
        ref={element => (this.scrollContainer = element)}
        style={{ paddingTop: this.props.project.qualifier === 'TRK' ? 52 : undefined }}>
        {byVersionByDay.map((version, idx) => {
          const days = Object.keys(version.byDay);
          if (days.length <= 0) {
            return null;
          }
          return (
            <li key={version.key || 'noversion'}>
              {version.version && (
                <div className={classNames('project-activity-version-badge', { first: idx === 0 })}>
                  <Tooltip
                    mouseEnterDelay={0.5}
                    overlay={`${translate('version')} ${version.version}`}>
                    <span className="badge">{version.version}</span>
                  </Tooltip>
                </div>
              )}
              <ul className="project-activity-days-list">
                {days.map(day => (
                  <li
                    className="project-activity-day"
                    data-day={toShortNotSoISOString(Number(day))}
                    key={day}>
                    <div className="project-activity-date">
                      <DateFormatter date={Number(day)} long={true} />
                    </div>
                    <ul className="project-activity-analyses-list">
                      {version.byDay[day] != null &&
                        version.byDay[day].map(analysis => (
                          <ProjectActivityAnalysis
                            addCustomEvent={this.props.addCustomEvent}
                            addVersion={this.props.addVersion}
                            analysis={analysis}
                            canAdmin={this.props.canAdmin}
                            canCreateVersion={this.props.project.qualifier === 'TRK'}
                            canDeleteAnalyses={this.props.canDeleteAnalyses}
                            changeEvent={this.props.changeEvent}
                            deleteAnalysis={this.props.deleteAnalysis}
                            deleteEvent={this.props.deleteEvent}
                            isFirst={analysis.key === firstAnalysisKey}
                            key={analysis.key}
                            selected={analysis.date.valueOf() === selectedDate}
                            updateSelectedDate={this.updateSelectedDate}
                          />
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
        {this.props.analysesLoading && (
          <li className="text-center">
            <i className="spinner" />
          </li>
        )}
      </ul>
    );
  }
}

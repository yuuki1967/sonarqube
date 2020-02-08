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
import * as key from 'keymaster';
import Helmet from 'react-helmet';
import { keyBy, omit, without } from 'lodash';
import BulkChangeModal, { MAX_PAGE_SIZE } from './BulkChangeModal';
import ComponentBreadcrumbs from './ComponentBreadcrumbs';
import IssuesList from './IssuesList';
import IssuesSourceViewer from './IssuesSourceViewer';
import MyIssuesFilter from './MyIssuesFilter';
import NoIssues from './NoIssues';
import NoMyIssues from './NoMyIssues';
import PageActions from './PageActions';
import ConciseIssuesList from '../conciseIssuesList/ConciseIssuesList';
import ConciseIssuesListHeader from '../conciseIssuesList/ConciseIssuesListHeader';
import Sidebar from '../sidebar/Sidebar';
import * as actions from '../actions';
import {
  areMyIssuesSelected,
  areQueriesEqual,
  Facet,
  getOpen,
  mapFacet,
  parseFacets,
  parseQuery,
  Query,
  RawFacet,
  ReferencedComponent,
  ReferencedLanguage,
  ReferencedUser,
  saveMyIssues,
  serializeQuery,
  STANDARDS,
  ReferencedRule
} from '../utils';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/buttons';
import Checkbox from '../../../components/controls/Checkbox';
import DeferredSpinner from '../../../components/common/DeferredSpinner';
import EmptySearch from '../../../components/common/EmptySearch';
import FiltersHeader from '../../../components/common/FiltersHeader';
import handleRequiredAuthentication from '../../../app/utils/handleRequiredAuthentication';
import ListFooter from '../../../components/controls/ListFooter';
import ScreenPositionHelper from '../../../components/common/ScreenPositionHelper';
import Suggestions from '../../../app/components/embed-docs-modal/Suggestions';
import {
  isShortLivingBranch,
  isSameBranchLike,
  getBranchLikeQuery,
  isPullRequest,
  fillBranchLike
} from '../../../helpers/branches';
import { translate, translateWithParameters } from '../../../helpers/l10n';
import { RawQuery } from '../../../helpers/query';
import {
  addSideBarClass,
  addWhitePageClass,
  removeSideBarClass,
  removeWhitePageClass
} from '../../../helpers/pages';
import { scrollToElement } from '../../../helpers/scrolling';
import { isSonarCloud } from '../../../helpers/system';
import { withRouter, Location, Router } from '../../../components/hoc/withRouter';
import '../../../components/search-navigator.css';
import '../styles.css';

interface FetchIssuesPromise {
  components: ReferencedComponent[];
  effortTotal: number;
  facets: RawFacet[];
  issues: T.Issue[];
  languages: ReferencedLanguage[];
  paging: T.Paging;
  rules: ReferencedRule[];
  users: ReferencedUser[];
}

interface Props {
  branchLike?: T.BranchLike;
  component?: T.Component;
  currentUser: T.CurrentUser;
  fetchIssues: (query: RawQuery, requestOrganizations?: boolean) => Promise<FetchIssuesPromise>;
  hideAuthorFacet?: boolean;
  location: Pick<Location, 'pathname' | 'query'>;
  multiOrganizations?: boolean;
  myIssues?: boolean;
  onBranchesChange: () => void;
  organization?: { key: string };
  router: Pick<Router, 'push' | 'replace'>;
  userOrganizations: T.Organization[];
}

export interface State {
  bulkChangeModal: boolean;
  checkAll?: boolean;
  checked: string[];
  effortTotal?: number;
  facets: { [facet: string]: Facet };
  issues: T.Issue[];
  loading: boolean;
  loadingFacets: { [key: string]: boolean };
  loadingMore: boolean;
  locationsNavigator: boolean;
  myIssues: boolean;
  openFacets: { [facet: string]: boolean };
  openIssue?: T.Issue;
  openPopup?: { issue: string; name: string };
  paging?: T.Paging;
  query: Query;
  referencedComponentsById: { [id: string]: ReferencedComponent };
  referencedComponentsByKey: { [key: string]: ReferencedComponent };
  referencedLanguages: { [languageKey: string]: ReferencedLanguage };
  referencedRules: { [ruleKey: string]: ReferencedRule };
  referencedUsers: { [login: string]: ReferencedUser };
  selected?: string;
  selectedFlowIndex?: number;
  selectedLocationIndex?: number;
}

const DEFAULT_QUERY = { resolved: 'false' };

export class App extends React.PureComponent<Props, State> {
  mounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      bulkChangeModal: false,
      checked: [],
      facets: {},
      issues: [],
      loading: true,
      loadingFacets: {},
      loadingMore: false,
      locationsNavigator: false,
      myIssues: props.myIssues || areMyIssuesSelected(props.location.query),
      openFacets: { severities: true, types: true },
      query: parseQuery(props.location.query),
      referencedComponentsById: {},
      referencedComponentsByKey: {},
      referencedLanguages: {},
      referencedRules: {},
      referencedUsers: {},
      selected: getOpen(props.location.query)
    };
  }

  componentDidMount() {
    this.mounted = true;

    if (this.state.myIssues && !this.props.currentUser.isLoggedIn) {
      handleRequiredAuthentication();
      return;
    }

    addWhitePageClass();
    addSideBarClass();
    this.attachShortcuts();
    this.fetchFirstIssues();
  }

  componentWillReceiveProps(nextProps: Props) {
    const openIssue = this.getOpenIssue(nextProps, this.state.issues);

    if (openIssue && openIssue.key !== this.state.selected) {
      this.setState({
        locationsNavigator: false,
        selected: openIssue.key,
        selectedFlowIndex: undefined,
        selectedLocationIndex: undefined
      });
    }

    if (!openIssue) {
      this.setState({ selectedFlowIndex: undefined, selectedLocationIndex: undefined });
    }

    this.setState({
      myIssues: nextProps.myIssues || areMyIssuesSelected(nextProps.location.query),
      openIssue,
      query: parseQuery(nextProps.location.query)
    });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { query } = this.props.location;
    const { query: prevQuery } = prevProps.location;
    if (
      prevProps.component !== this.props.component ||
      !isSameBranchLike(prevProps.branchLike, this.props.branchLike) ||
      !areQueriesEqual(prevQuery, query) ||
      areMyIssuesSelected(prevQuery) !== areMyIssuesSelected(query)
    ) {
      this.fetchFirstIssues();
      this.setState({ checkAll: false });
    } else if (
      !this.state.openIssue &&
      (prevState.selected !== this.state.selected || prevState.openIssue)
    ) {
      // if user simply selected another issue
      // or if he went from the source code back to the list of issues
      this.scrollToSelectedIssue();
    }
  }

  componentWillUnmount() {
    this.detachShortcuts();
    this.mounted = false;
    removeWhitePageClass();
    removeSideBarClass();
  }

  attachShortcuts() {
    key.setScope('issues');
    key('up', 'issues', () => {
      this.selectPreviousIssue();
      return false;
    });
    key('down', 'issues', () => {
      this.selectNextIssue();
      return false;
    });
    key('right', 'issues', () => {
      this.openSelectedIssue();
      return false;
    });
    key('left', 'issues', () => {
      if (this.state.query.issues.length !== 1) {
        this.closeIssue();
      }
      return false;
    });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  detachShortcuts() {
    key.deleteScope('issues');
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if (key.getScope() !== 'issues') {
      return;
    }
    if (event.keyCode === 18) {
      // alt
      event.preventDefault();
      this.setState(actions.enableLocationsNavigator);
    } else if (event.keyCode === 40 && event.altKey) {
      // alt + down
      event.preventDefault();
      this.selectNextLocation();
    } else if (event.keyCode === 38 && event.altKey) {
      // alt + up
      event.preventDefault();
      this.selectPreviousLocation();
    } else if (event.keyCode === 37 && event.altKey) {
      // alt + left
      event.preventDefault();
      this.selectPreviousFlow();
    } else if (event.keyCode === 39 && event.altKey) {
      // alt + right
      event.preventDefault();
      this.selectNextFlow();
    }
  };

  handleKeyUp = (event: KeyboardEvent) => {
    if (key.getScope() !== 'issues') {
      return;
    }
    if (event.keyCode === 18) {
      // alt
      this.setState(actions.disableLocationsNavigator);
    }
  };

  getSelectedIndex() {
    const { issues = [], selected } = this.state;
    const index = issues.findIndex(issue => issue.key === selected);
    return index !== -1 ? index : undefined;
  }

  getOpenIssue = (props: Props, issues: T.Issue[]) => {
    const open = getOpen(props.location.query);
    return open ? issues.find(issue => issue.key === open) : undefined;
  };

  selectNextIssue = () => {
    const { issues } = this.state;
    const selectedIndex = this.getSelectedIndex();
    if (selectedIndex !== undefined && selectedIndex < issues.length - 1) {
      if (this.state.openIssue) {
        this.openIssue(issues[selectedIndex + 1].key);
      } else {
        this.setState({
          selected: issues[selectedIndex + 1].key,
          selectedFlowIndex: undefined,
          selectedLocationIndex: undefined
        });
      }
    }
  };

  selectPreviousIssue = () => {
    const { issues } = this.state;
    const selectedIndex = this.getSelectedIndex();
    if (selectedIndex !== undefined && selectedIndex > 0) {
      if (this.state.openIssue) {
        this.openIssue(issues[selectedIndex - 1].key);
      } else {
        this.setState({
          selected: issues[selectedIndex - 1].key,
          selectedFlowIndex: undefined,
          selectedLocationIndex: undefined
        });
      }
    }
  };

  openIssue = (issueKey: string) => {
    const path = {
      pathname: this.props.location.pathname,
      query: {
        ...serializeQuery(this.state.query),
        ...getBranchLikeQuery(this.props.branchLike),
        id: this.props.component && this.props.component.key,
        myIssues: this.state.myIssues ? 'true' : undefined,
        open: issueKey
      }
    };
    if (this.state.openIssue) {
      if (path.query.open && path.query.open === this.state.openIssue.key) {
        this.setState(
          {
            locationsNavigator: false,
            selectedFlowIndex: undefined,
            selectedLocationIndex: undefined
          },
          this.scrollToSelectedIssue
        );
      } else {
        this.props.router.replace(path);
      }
    } else {
      this.props.router.push(path);
    }
  };

  closeIssue = () => {
    if (this.state.query) {
      this.props.router.push({
        pathname: this.props.location.pathname,
        query: {
          ...serializeQuery(this.state.query),
          ...getBranchLikeQuery(this.props.branchLike),
          id: this.props.component && this.props.component.key,
          myIssues: this.state.myIssues ? 'true' : undefined,
          open: undefined
        }
      });
      this.scrollToSelectedIssue(false);
    }
  };

  openSelectedIssue = () => {
    const { selected } = this.state;
    if (selected) {
      this.openIssue(selected);
    }
  };

  scrollToSelectedIssue = (smooth = true) => {
    const { selected } = this.state;
    if (selected) {
      const element = document.querySelector(`[data-issue="${selected}"]`);
      if (element) {
        scrollToElement(element, { topOffset: 250, bottomOffset: 100, smooth });
      }
    }
  };

  fetchIssues = (
    additional: RawQuery,
    requestFacets = false,
    requestOrganizations = true
  ): Promise<FetchIssuesPromise> => {
    const { component } = this.props;
    const { myIssues, openFacets, query } = this.state;

    const facets = requestFacets
      ? Object.keys(openFacets)
          .filter(facet => openFacets[facet])
          .filter(facet => facet !== STANDARDS)
          .map(mapFacet)
          .join(',')
      : undefined;

    const organizationKey =
      (component && component.organization) ||
      (this.props.organization && this.props.organization.key);

    const parameters = {
      ...getBranchLikeQuery(this.props.branchLike),
      componentKeys: component && component.key,
      s: 'FILE_LINE',
      ...serializeQuery(query),
      ps: '100',
      organization: organizationKey,
      facets,
      ...additional
    };

    // only sorting by CREATION_DATE is allowed, so let's sort DESC
    if (query.sort) {
      Object.assign(parameters, { asc: 'false' });
    }

    if (myIssues) {
      Object.assign(parameters, { assignees: '__me__' });
    }

    return this.props.fetchIssues(
      parameters,
      Boolean(requestOrganizations && this.props.multiOrganizations)
    );
  };

  fetchFirstIssues() {
    const prevQuery = this.props.location.query;
    this.setState({ checked: [], loading: true });
    return this.fetchIssues({}, true).then(
      ({ effortTotal, facets, issues, paging, ...other }) => {
        if (this.mounted && areQueriesEqual(prevQuery, this.props.location.query)) {
          const openIssue = this.getOpenIssue(this.props, issues);
          let selected: string | undefined = undefined;
          if (issues.length > 0) {
            selected = openIssue ? openIssue.key : issues[0].key;
          }
          this.setState(state => ({
            effortTotal,
            facets: { ...state.facets, ...parseFacets(facets) },
            loading: false,
            issues,
            openIssue,
            paging,
            referencedComponentsById: keyBy(other.components, 'uuid'),
            referencedComponentsByKey: keyBy(other.components, 'key'),
            referencedLanguages: keyBy(other.languages, 'key'),
            referencedRules: keyBy(other.rules, 'key'),
            referencedUsers: keyBy(other.users, 'login'),
            selected,
            selectedFlowIndex: undefined,
            selectedLocationIndex: undefined
          }));
        }
        return issues;
      },
      () => {
        if (this.mounted && areQueriesEqual(prevQuery, this.props.location.query)) {
          this.setState({ loading: false });
        }
        return [];
      }
    );
  }

  fetchIssuesPage = (p: number) => {
    return this.fetchIssues({ p });
  };

  fetchIssuesUntil = (
    p: number,
    done: (lastIssue: T.Issue, paging: T.Paging) => boolean
  ): Promise<{ issues: T.Issue[]; paging: T.Paging }> => {
    const recursiveFetch = (
      p: number,
      issues: T.Issue[]
    ): Promise<{ issues: T.Issue[]; paging: T.Paging }> => {
      return this.fetchIssuesPage(p)
        .then(response => {
          return {
            issues: [...issues, ...response.issues],
            paging: response.paging
          };
        })
        .then(({ issues, paging }) => {
          return done(issues[issues.length - 1], paging)
            ? { issues, paging }
            : recursiveFetch(p + 1, issues);
        });
    };

    return recursiveFetch(p, []);
  };

  fetchMoreIssues = () => {
    const { paging } = this.state;

    if (!paging) {
      return;
    }

    const p = paging.pageIndex + 1;

    this.setState({ checkAll: false, loadingMore: true });
    this.fetchIssuesPage(p).then(
      response => {
        if (this.mounted) {
          this.setState(state => ({
            loadingMore: false,
            issues: [...state.issues, ...response.issues],
            paging: response.paging
          }));
        }
      },
      () => {
        if (this.mounted) {
          this.setState({ loadingMore: false });
        }
      }
    );
  };

  fetchIssuesForComponent = (_component: string, _from: number, to: number) => {
    const { issues, openIssue, paging } = this.state;

    if (!openIssue || !paging) {
      return Promise.reject(undefined);
    }

    const isSameComponent = (issue: T.Issue) => issue.component === openIssue.component;

    const done = (lastIssue: T.Issue, paging: T.Paging) => {
      if (paging.total <= paging.pageIndex * paging.pageSize) {
        return true;
      }
      if (lastIssue.component !== openIssue.component) {
        return true;
      }
      return lastIssue.textRange !== undefined && lastIssue.textRange.endLine > to;
    };

    if (done(issues[issues.length - 1], paging)) {
      return Promise.resolve(issues.filter(isSameComponent));
    }

    this.setState({ loading: true });
    return this.fetchIssuesUntil(paging.pageIndex + 1, done).then(
      response => {
        const nextIssues = [...issues, ...response.issues];
        if (this.mounted) {
          this.setState({
            issues: nextIssues,
            loading: false,
            paging: response.paging
          });
        }
        return nextIssues.filter(isSameComponent);
      },
      () => {
        if (this.mounted) {
          this.setState({ loading: false });
        }
        return [];
      }
    );
  };

  fetchFacet = (facet: string) => {
    const requestOrganizations = facet === 'projects';
    this.setState(state => ({ loadingFacets: { ...state.loadingFacets, [facet]: true } }));
    return this.fetchIssues({ ps: 1, facets: mapFacet(facet) }, false, requestOrganizations).then(
      ({ facets, ...other }) => {
        if (this.mounted) {
          this.setState(state => ({
            facets: { ...state.facets, ...parseFacets(facets) },
            loadingFacets: omit(state.loadingFacets, facet),
            referencedComponentsById: {
              ...state.referencedComponentsById,
              ...keyBy(other.components, 'uuid')
            },
            referencedComponentsByKey: {
              ...state.referencedComponentsByKey,
              ...keyBy(other.components, 'key')
            },
            referencedLanguages: {
              ...state.referencedLanguages,
              ...keyBy(other.languages, 'key')
            },
            referencedRules: { ...state.referencedRules, ...keyBy(other.rules, 'key') },
            referencedUsers: { ...state.referencedUsers, ...keyBy(other.users, 'login') }
          }));
        }
      },
      () => {}
    );
  };

  isFiltered = () => {
    const serialized = serializeQuery(this.state.query);
    return !areQueriesEqual(serialized, DEFAULT_QUERY);
  };

  getCheckedIssues = () => {
    const issues = this.state.checked
      .map(checked => this.state.issues.find(issue => issue.key === checked))
      .filter((issue): issue is T.Issue => issue !== undefined);
    const paging = { pageIndex: 1, pageSize: issues.length, total: issues.length };
    return Promise.resolve({ issues, paging });
  };

  getButtonLabel = (checked: string[], checkAll?: boolean, paging?: T.Paging) => {
    if (checked.length > 0) {
      let count;
      if (checkAll && paging) {
        count = paging.total > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : paging.total;
      } else {
        count = Math.min(checked.length, MAX_PAGE_SIZE);
      }

      return translateWithParameters('issues.bulk_change_X_issues', count);
    } else {
      return translate('bulk_change');
    }
  };

  handleFilterChange = (changes: Partial<Query>) => {
    this.setState({ loading: true });
    this.props.router.push({
      pathname: this.props.location.pathname,
      query: {
        ...serializeQuery({ ...this.state.query, ...changes }),
        ...getBranchLikeQuery(this.props.branchLike),
        id: this.props.component && this.props.component.key,
        myIssues: this.state.myIssues ? 'true' : undefined
      }
    });
  };

  handleMyIssuesChange = (myIssues: boolean) => {
    this.closeFacet('assignees');
    if (!this.props.component) {
      saveMyIssues(myIssues);
    }
    this.props.router.push({
      pathname: this.props.location.pathname,
      query: {
        ...serializeQuery({ ...this.state.query, assigned: true, assignees: [] }),
        ...getBranchLikeQuery(this.props.branchLike),
        id: this.props.component && this.props.component.key,
        myIssues: myIssues ? 'true' : undefined
      }
    });
  };

  loadSearchResultCount = (property: string, changes: Partial<Query>) => {
    const { component } = this.props;
    const { myIssues, query } = this.state;

    const organizationKey =
      (component && component.organization) ||
      (this.props.organization && this.props.organization.key);

    const parameters = {
      ...getBranchLikeQuery(this.props.branchLike),
      componentKeys: component && component.key,
      facets: mapFacet(property),
      s: 'FILE_LINE',
      ...serializeQuery({ ...query, ...changes }),
      ps: 1,
      organization: organizationKey
    };

    if (myIssues) {
      Object.assign(parameters, { assignees: '__me__' });
    }

    return this.props
      .fetchIssues(parameters, false)
      .then(({ facets }) => parseFacets(facets)[property]);
  };

  closeFacet = (property: string) => {
    this.setState(state => ({
      openFacets: { ...state.openFacets, [property]: false }
    }));
  };

  handleFacetToggle = (property: string) => {
    this.setState(state => ({
      openFacets: { ...state.openFacets, [property]: !state.openFacets[property] }
    }));
    if (property !== STANDARDS && !this.state.facets[property]) {
      this.fetchFacet(property);
    }
  };

  handleReset = () => {
    this.props.router.push({
      pathname: this.props.location.pathname,
      query: {
        ...DEFAULT_QUERY,
        ...getBranchLikeQuery(this.props.branchLike),
        id: this.props.component && this.props.component.key,
        myIssues: this.state.myIssues ? 'true' : undefined
      }
    });
  };

  handlePopupToggle = (issue: string, popupName: string, open?: boolean) => {
    this.setState((state: State) => {
      const samePopup =
        state.openPopup && state.openPopup.name === popupName && state.openPopup.issue === issue;
      if (open !== false && !samePopup) {
        return { openPopup: { issue, name: popupName } };
      } else if (open !== true && samePopup) {
        return { openPopup: undefined };
      }
      return state;
    });
  };

  handleIssueCheck = (issue: string) => {
    this.setState(state => ({
      checkAll: false,
      checked: state.checked.includes(issue)
        ? without(state.checked, issue)
        : [...state.checked, issue]
    }));
  };

  handleIssueChange = (issue: T.Issue) => {
    this.setState(state => ({
      issues: state.issues.map(candidate => (candidate.key === issue.key ? issue : candidate))
    }));
  };

  handleOpenBulkChange = () => {
    key.setScope('issues-bulk-change');
    this.setState({ bulkChangeModal: true });
  };

  handleCloseBulkChange = () => {
    key.setScope('issues');
    this.setState({ bulkChangeModal: false });
  };

  handleBulkChangeDone = () => {
    this.setState({ checkAll: false });
    this.fetchFirstIssues();
    this.handleCloseBulkChange();
  };

  handleReload = () => {
    this.fetchFirstIssues();
    if (isShortLivingBranch(this.props.branchLike) || isPullRequest(this.props.branchLike)) {
      this.props.onBranchesChange();
    }
  };

  handleReloadAndOpenFirst = () => {
    this.fetchFirstIssues().then(
      issues => {
        if (issues.length > 0) {
          this.openIssue(issues[0].key);
        }
      },
      () => {}
    );
  };

  selectLocation = (index?: number) => {
    this.setState(actions.selectLocation(index));
  };

  selectNextLocation = () => {
    this.setState(actions.selectNextLocation);
  };

  selectPreviousLocation = () => {
    this.setState(actions.selectPreviousLocation);
  };

  handleCheckAll = (checked: boolean) => {
    if (checked) {
      this.setState(state => ({
        checkAll: true,
        checked: state.issues.map(issue => issue.key)
      }));
    } else {
      this.setState({ checkAll: false, checked: [] });
    }
  };

  selectFlow = (index?: number) => {
    this.setState(actions.selectFlow(index));
  };

  selectNextFlow = () => {
    this.setState(actions.selectNextFlow);
  };

  selectPreviousFlow = () => {
    this.setState(actions.selectPreviousFlow);
  };

  renderBulkChange(openIssue: T.Issue | undefined) {
    const { component, currentUser } = this.props;
    const { checkAll, bulkChangeModal, checked, issues, paging } = this.state;

    const isAllChecked = checked.length > 0 && issues.length === checked.length;
    const thirdState = checked.length > 0 && !isAllChecked;
    const isChecked = isAllChecked || thirdState;

    if (!currentUser.isLoggedIn || openIssue) {
      return null;
    }

    return (
      <div className="pull-left">
        <Checkbox
          checked={isChecked}
          className="spacer-right vertical-middle"
          disabled={issues.length === 0}
          id="issues-selection"
          onCheck={this.handleCheckAll}
          thirdState={thirdState}
        />
        <Button
          disabled={checked.length === 0}
          id="issues-bulk-change"
          onClick={this.handleOpenBulkChange}>
          {this.getButtonLabel(checked, checkAll, paging)}
        </Button>

        {bulkChangeModal && (
          <BulkChangeModal
            component={component}
            currentUser={currentUser}
            fetchIssues={checkAll ? this.fetchIssues : this.getCheckedIssues}
            onClose={this.handleCloseBulkChange}
            onDone={this.handleBulkChangeDone}
            organization={this.props.organization}
          />
        )}
      </div>
    );
  }

  renderFacets() {
    const { component, currentUser, userOrganizations } = this.props;
    const { query } = this.state;

    const organizationKey =
      (component && component.organization) ||
      (this.props.organization && this.props.organization.key);

    const userOrganization =
      !isSonarCloud() ||
      userOrganizations.find(o => {
        return o.key === organizationKey;
      });
    const hideAuthorFacet =
      this.props.hideAuthorFacet || (isSonarCloud() && this.props.myIssues) || !userOrganization;

    return (
      <div className="layout-page-filters">
        {currentUser.isLoggedIn &&
          !isSonarCloud() && (
            <MyIssuesFilter
              myIssues={this.state.myIssues}
              onMyIssuesChange={this.handleMyIssuesChange}
            />
          )}
        <FiltersHeader displayReset={this.isFiltered()} onReset={this.handleReset} />
        <Sidebar
          component={component}
          facets={this.state.facets}
          hideAuthorFacet={hideAuthorFacet}
          loadSearchResultCount={this.loadSearchResultCount}
          loadingFacets={this.state.loadingFacets}
          myIssues={this.state.myIssues}
          onFacetToggle={this.handleFacetToggle}
          onFilterChange={this.handleFilterChange}
          openFacets={this.state.openFacets}
          organization={this.props.organization}
          query={query}
          referencedComponentsById={this.state.referencedComponentsById}
          referencedComponentsByKey={this.state.referencedComponentsByKey}
          referencedLanguages={this.state.referencedLanguages}
          referencedRules={this.state.referencedRules}
          referencedUsers={this.state.referencedUsers}
        />
      </div>
    );
  }

  renderConciseIssuesList() {
    const { issues, loadingMore, paging, query } = this.state;

    return (
      <div className="layout-page-filters">
        <ConciseIssuesListHeader
          displayBackButton={query.issues.length !== 1}
          loading={this.state.loading}
          onBackClick={this.closeIssue}
          onReload={this.handleReloadAndOpenFirst}
          paging={paging}
          selectedIndex={this.getSelectedIndex()}
        />
        <ConciseIssuesList
          issues={issues}
          onFlowSelect={this.selectFlow}
          onIssueSelect={this.openIssue}
          onLocationSelect={this.selectLocation}
          selected={this.state.selected}
          selectedFlowIndex={this.state.selectedFlowIndex}
          selectedLocationIndex={this.state.selectedLocationIndex}
        />
        {paging &&
          paging.total > 0 && (
            <ListFooter
              count={issues.length}
              loadMore={this.fetchMoreIssues}
              loading={loadingMore}
              total={paging.total}
            />
          )}
      </div>
    );
  }

  renderSide(openIssue: T.Issue | undefined) {
    return (
      <ScreenPositionHelper className="layout-page-side-outer">
        {({ top }) => (
          <div className="layout-page-side" style={{ top }}>
            <div className="layout-page-side-inner">
              {openIssue ? this.renderConciseIssuesList() : this.renderFacets()}
            </div>
          </div>
        )}
      </ScreenPositionHelper>
    );
  }

  renderList() {
    const { branchLike, component, currentUser, organization } = this.props;
    const { issues, loading, loadingMore, openIssue, paging } = this.state;
    const selectedIndex = this.getSelectedIndex();
    const selectedIssue = selectedIndex !== undefined ? issues[selectedIndex] : undefined;

    if (!paging || openIssue) {
      return null;
    }

    let noIssuesMessage = null;
    if (paging.total === 0 && !loading) {
      if (this.isFiltered()) {
        noIssuesMessage = <EmptySearch />;
      } else if (this.state.myIssues) {
        noIssuesMessage = <NoMyIssues />;
      } else {
        noIssuesMessage = <NoIssues />;
      }
    }

    return (
      <div>
        {paging.total > 0 && (
          <IssuesList
            branchLike={branchLike}
            checked={this.state.checked}
            component={component}
            issues={issues}
            onFilterChange={this.handleFilterChange}
            onIssueChange={this.handleIssueChange}
            onIssueCheck={currentUser.isLoggedIn ? this.handleIssueCheck : undefined}
            onIssueClick={this.openIssue}
            onPopupToggle={this.handlePopupToggle}
            openPopup={this.state.openPopup}
            organization={organization}
            selectedIssue={selectedIssue}
          />
        )}

        {paging.total > 0 && (
          <ListFooter
            count={issues.length}
            loadMore={this.fetchMoreIssues}
            loading={loadingMore}
            total={paging.total}
          />
        )}

        {noIssuesMessage}
      </div>
    );
  }

  renderShortcutsForLocations() {
    const { openIssue } = this.state;
    if (!openIssue || (!openIssue.secondaryLocations.length && !openIssue.flows.length)) {
      return null;
    }
    const hasSeveralFlows = openIssue.flows.length > 1;
    return (
      <div className="pull-right note">
        <span className="shortcut-button little-spacer-right">alt</span>
        <span className="little-spacer-right">{'+'}</span>
        <span className="shortcut-button little-spacer-right">↑</span>
        <span className="shortcut-button little-spacer-right">↓</span>
        {hasSeveralFlows && (
          <span>
            <span className="shortcut-button little-spacer-right">←</span>
            <span className="shortcut-button little-spacer-right">→</span>
          </span>
        )}
        {translate('issues.to_navigate_issue_locations')}
      </div>
    );
  }

  renderPage() {
    const { checkAll, loading, openIssue, paging } = this.state;
    return (
      <div className="layout-page-main-inner">
        {openIssue ? (
          <IssuesSourceViewer
            branchLike={fillBranchLike(openIssue.branch, openIssue.pullRequest)}
            loadIssues={this.fetchIssuesForComponent}
            locationsNavigator={this.state.locationsNavigator}
            onIssueChange={this.handleIssueChange}
            onIssueSelect={this.openIssue}
            onLocationSelect={this.selectLocation}
            openIssue={openIssue}
            selectedFlowIndex={this.state.selectedFlowIndex}
            selectedLocationIndex={this.state.selectedLocationIndex}
          />
        ) : (
          <DeferredSpinner loading={loading}>
            {checkAll &&
              paging &&
              paging.total > MAX_PAGE_SIZE && (
                <Alert className="big-spacer-bottom" variant="warning">
                  <FormattedMessage
                    defaultMessage={translate('issue_bulk_change.max_issues_reached')}
                    id="issue_bulk_change.max_issues_reached"
                    values={{ max: <strong>{MAX_PAGE_SIZE}</strong> }}
                  />
                </Alert>
              )}
            {this.renderList()}
          </DeferredSpinner>
        )}
      </div>
    );
  }

  render() {
    const { component } = this.props;
    const { openIssue, paging } = this.state;
    const selectedIndex = this.getSelectedIndex();
    return (
      <div className="layout-page issues" id="issues-page">
        <Suggestions suggestions="issues" />
        <Helmet title={openIssue ? openIssue.message : translate('issues.page')} />

        {this.renderSide(openIssue)}

        <div className="layout-page-main">
          <div className="layout-page-header-panel layout-page-main-header issues-main-header">
            <div className="layout-page-header-panel-inner layout-page-main-header-inner">
              <div className="layout-page-main-inner">
                {this.renderBulkChange(openIssue)}
                {openIssue ? (
                  <div className="pull-left width-60">
                    <ComponentBreadcrumbs
                      component={component}
                      issue={openIssue}
                      organization={this.props.organization}
                      selectedFlowIndex={this.state.selectedFlowIndex}
                      selectedLocationIndex={this.state.selectedLocationIndex}
                    />
                  </div>
                ) : (
                  <PageActions
                    canSetHome={Boolean(
                      !this.props.organization &&
                        !this.props.component &&
                        (!isSonarCloud() || this.props.myIssues)
                    )}
                    effortTotal={this.state.effortTotal}
                    onReload={this.handleReload}
                    paging={paging}
                    selectedIndex={selectedIndex}
                  />
                )}
                {this.renderShortcutsForLocations()}
              </div>
            </div>
          </div>

          {this.renderPage()}
        </div>
      </div>
    );
  }
}

export default withRouter(App);

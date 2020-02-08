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
import HelpTooltip from '../controls/HelpTooltip';
import { lazyLoad } from '../lazyLoad';

const DocMarkdownBlock = lazyLoad(() => import('./DocMarkdownBlock'));

interface Props {
  className?: string;
  children?: React.ReactNode;
  // Use as `import(/* webpackMode: "eager" */ 'Docs/tooltips/foo/bar.md')`
  doc: Promise<{ default: string }>;
  overlayProps?: { [k: string]: string };
}

interface State {
  content?: string;
  open: boolean;
}

export default class DocTooltip extends React.PureComponent<Props, State> {
  state: State = { open: false };

  componentDidMount() {
    this.props.doc.then(
      ({ default: content }) => {
        this.setState({ content });
      },
      () => {}
    );
    document.addEventListener('scroll', this.close, true);
  }

  componentWillUnmount() {
    document.removeEventListener('scroll', this.close, true);
  }

  close = () => {
    this.setState({ open: false });
  };

  render() {
    return this.state.content ? (
      <HelpTooltip
        className={this.props.className}
        overlay={
          <div className="abs-width-300">
            <DocMarkdownBlock
              childProps={this.props.overlayProps}
              className="cut-margins"
              content={this.state.content}
              isTooltip={true}
            />
          </div>
        }>
        {this.props.children}
      </HelpTooltip>
    ) : (
      this.props.children || null
    );
  }
}

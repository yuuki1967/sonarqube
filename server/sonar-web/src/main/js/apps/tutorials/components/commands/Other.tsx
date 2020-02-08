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
import SQScanner from './SQScanner';
import CodeSnippet from '../../../../components/common/CodeSnippet';
import InstanceMessage from '../../../../components/common/InstanceMessage';
import { translate } from '../../../../helpers/l10n';
import { quote } from '../../utils';

interface Props {
  host: string;
  organization?: string;
  os: string;
  projectKey: string;
  token: string;
}

export default function Other(props: Props) {
  const q = quote(props.os);
  const command = [
    props.os === 'win' ? 'sonar-scanner.bat' : 'sonar-scanner',
    '-D' + q(`sonar.projectKey=${props.projectKey}`),
    props.organization && '-D' + q(`sonar.organization=${props.organization}`),
    '-D' + q('sonar.sources=.'),
    '-D' + q(`sonar.host.url=${props.host}`),
    '-D' + q(`sonar.login=${props.token}`)
  ];

  return (
    <div>
      <SQScanner os={props.os} />

      <h4 className="huge-spacer-top spacer-bottom">
        {translate('onboarding.analysis.sq_scanner.execute')}
      </h4>
      <InstanceMessage message={translate('onboarding.analysis.sq_scanner.execute.text')}>
        {transformedMessage => (
          <p
            className="spacer-bottom markdown"
            dangerouslySetInnerHTML={{ __html: transformedMessage }}
          />
        )}
      </InstanceMessage>
      <CodeSnippet isOneLine={props.os === 'win'} snippet={command} />
      <p
        className="big-spacer-top markdown"
        dangerouslySetInnerHTML={{ __html: translate('onboarding.analysis.sq_scanner.docs') }}
      />
    </div>
  );
}

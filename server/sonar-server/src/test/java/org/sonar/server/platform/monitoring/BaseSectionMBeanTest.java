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
package org.sonar.server.platform.monitoring;

import java.lang.management.ManagementFactory;
import javax.annotation.CheckForNull;
import javax.management.InstanceNotFoundException;
import javax.management.ObjectInstance;
import javax.management.ObjectName;
import org.junit.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class BaseSectionMBeanTest {

  private FakeSection underTest = new FakeSection();

  @Test
  public void test_registration() throws Exception {
    assertThat(getMBean()).isNull();

    underTest.start();
    assertThat(getMBean()).isNotNull();

    underTest.stop();
    assertThat(getMBean()).isNull();
  }

  @Test
  public void do_not_fail_when_stopping_unstarted() throws Exception {
    underTest.stop();
    assertThat(getMBean()).isNull();
  }

  @CheckForNull
  private ObjectInstance getMBean() throws Exception {
    try {
      return ManagementFactory.getPlatformMBeanServer().getObjectInstance(new ObjectName(underTest.objectName()));
    } catch (InstanceNotFoundException e) {
      return null;
    }
  }

}

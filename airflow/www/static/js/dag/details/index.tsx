/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useCallback, useEffect } from "react";
import {
  Flex,
  Divider,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Tab,
  Text,
  Button,
} from "@chakra-ui/react";
import { useSearchParams } from "react-router-dom";

import useSelection from "src/dag/useSelection";
import { getTask, getMetaValue } from "src/utils";
import { useGridData, useTaskInstance } from "src/api";
import {
  MdDetails,
  MdAccountTree,
  MdReorder,
  MdCode,
  MdOutlineViewTimeline,
  MdSyncAlt,
  MdHourglassBottom,
} from "react-icons/md";
import { BiBracket } from "react-icons/bi";
import URLSearchParamsWrapper from "src/utils/URLSearchParamWrapper";

import Header from "./Header";
import TaskInstanceContent from "./taskInstance";
import DagRunContent from "./dagRun";
import DagContent from "./Dag";
import Graph from "./graph";
import Gantt from "./gantt";
import DagCode from "./dagCode";
import MappedInstances from "./taskInstance/MappedInstances";
import Logs from "./taskInstance/Logs";
import BackToTaskSummary from "./taskInstance/BackToTaskSummary";
import FilterTasks from "./FilterTasks";
import ClearRun from "./dagRun/ClearRun";
import MarkRunAs from "./dagRun/MarkRunAs";
import ClearInstance from "./taskInstance/taskActions/ClearInstance";
import MarkInstanceAs from "./taskInstance/taskActions/MarkInstanceAs";
import XcomCollection from "./taskInstance/Xcom";
import TaskDetails from "./task";

const dagId = getMetaValue("dag_id")!;

interface Props {
  openGroupIds: string[];
  onToggleGroups: (groupIds: string[]) => void;
  hoveredTaskState?: string | null;
  gridScrollRef: React.RefObject<HTMLDivElement>;
  ganttScrollRef: React.RefObject<HTMLDivElement>;
}

const tabToIndex = (tab?: string) => {
  switch (tab) {
    case "graph":
      return 1;
    case "gantt":
      return 2;
    case "code":
      return 3;
    case "logs":
    case "mapped_tasks":
      return 4;
    case "xcom":
      return 5;
    case "details":
    default:
      return 0;
  }
};

const indexToTab = (
  index: number,
  isTaskInstance: boolean,
  isMappedTaskSummary: boolean
) => {
  switch (index) {
    case 1:
      return "graph";
    case 2:
      return "gantt";
    case 3:
      return "code";
    case 4:
      if (isMappedTaskSummary) return "mapped_tasks";
      if (isTaskInstance) return "logs";
      return undefined;
    case 5:
      if (isTaskInstance) return "xcom";
      return undefined;
    case 0:
    default:
      return undefined;
  }
};

export const TAB_PARAM = "tab";

const Details = ({
  openGroupIds,
  onToggleGroups,
  hoveredTaskState,
  gridScrollRef,
  ganttScrollRef,
}: Props) => {
  const {
    selected: { runId, taskId, mapIndex },
    onSelect,
  } = useSelection();
  const isDag = !runId && !taskId;
  const isDagRun = runId && !taskId;

  const {
    data: { dagRuns, groups },
  } = useGridData();
  const group = getTask({ taskId, task: groups });
  const children = group?.children;
  const isMapped = group?.isMapped;
  const isGroup = !!children;

  const isMappedTaskSummary = !!(
    taskId &&
    runId &&
    !isGroup &&
    isMapped &&
    mapIndex === undefined
  );
  const isTaskInstance = !!(
    taskId &&
    runId &&
    !isGroup &&
    !isMappedTaskSummary
  );
  const showTaskDetails = !!taskId && !runId;

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get(TAB_PARAM) || undefined;
  const tabIndex = tabToIndex(tab);

  const onChangeTab = useCallback(
    (index: number) => {
      const params = new URLSearchParamsWrapper(searchParams);
      const newTab = indexToTab(index, isTaskInstance, isMappedTaskSummary);
      if (newTab) params.set(TAB_PARAM, newTab);
      else params.delete(TAB_PARAM);
      setSearchParams(params);
    },
    [setSearchParams, searchParams, isTaskInstance, isMappedTaskSummary]
  );

  useEffect(() => {
    // Default to graph tab when navigating from a task instance to a group/dag/dagrun
    const tabCount = runId && taskId && !isGroup ? 5 : 4;
    if (tabCount === 4 && tabIndex > 3) {
      if (!runId && taskId) onChangeTab(0);
      else onChangeTab(1);
    }
  }, [runId, taskId, tabIndex, isGroup, onChangeTab]);

  const run = dagRuns.find((r) => r.runId === runId);
  const { data: mappedTaskInstance } = useTaskInstance({
    dagId,
    dagRunId: runId || "",
    taskId: taskId || "",
    mapIndex,
    enabled: mapIndex !== undefined,
  });

  const instance =
    mapIndex !== undefined && mapIndex > -1
      ? mappedTaskInstance
      : group?.instances.find((ti) => ti.runId === runId);

  return (
    <Flex flexDirection="column" height="100%">
      <Flex
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        ml={6}
      >
        <Header />
        <Flex flexWrap="wrap">
          {runId && !taskId && (
            <>
              <ClearRun runId={runId} mr={2} />
              <MarkRunAs runId={runId} state={run?.state} />
            </>
          )}
          {runId && taskId && (
            <>
              <ClearInstance
                taskId={taskId}
                runId={runId}
                executionDate={run?.executionDate || ""}
                isGroup={isGroup}
                isMapped={isMapped}
                mapIndex={mapIndex}
                mt={2}
                mr={2}
              />
              <MarkInstanceAs
                taskId={taskId}
                runId={runId}
                state={
                  !instance?.state || instance?.state === "none"
                    ? undefined
                    : instance.state
                }
                isGroup={isGroup}
                isMapped={isMapped}
                mapIndex={mapIndex}
                mt={2}
                mr={2}
              />
            </>
          )}
          {taskId && runId && <FilterTasks taskId={taskId} />}
        </Flex>
      </Flex>
      <Divider my={2} />
      <Tabs
        size="lg"
        isLazy
        height="100%"
        index={tabIndex}
        onChange={onChangeTab}
      >
        <TabList>
          <Tab>
            <MdDetails size={16} />
            <Text as="strong" ml={1}>
              Details
            </Text>
          </Tab>
          <Tab>
            <MdAccountTree size={16} />
            <Text as="strong" ml={1}>
              Graph
            </Text>
          </Tab>
          <Tab>
            <MdOutlineViewTimeline size={16} />
            <Text as="strong" ml={1}>
              Gantt
            </Text>
          </Tab>
          <Tab>
            <MdCode size={16} />
            <Text as="strong" ml={1}>
              Code
            </Text>
          </Tab>
          {isTaskInstance && (
            <Tab>
              <MdReorder size={16} />
              <Text as="strong" ml={1}>
                Logs
              </Text>
            </Tab>
          )}
          {isMappedTaskSummary && (
            <Tab>
              <BiBracket size={16} />
              <Text as="strong" ml={1}>
                Mapped Tasks
              </Text>
            </Tab>
          )}
          {isTaskInstance && (
            <Tab>
              <MdSyncAlt size={16} />
              <Text as="strong" ml={1}>
                XCom
              </Text>
            </Tab>
          )}
          {/* Match the styling of a tab but its actually a button */}
          {!!taskId && !!runId && (
            <Button
              variant="unstyled"
              display="flex"
              alignItems="center"
              fontSize="lg"
              py={3}
              // need to split pl and pr instead of px
              pl={4}
              pr={4}
              mt="4px"
              onClick={() => {
                onChangeTab(0);
                onSelect({ taskId });
              }}
            >
              <MdHourglassBottom size={16} />
              <Text as="strong" ml={1}>
                Task Duration
              </Text>
            </Button>
          )}
        </TabList>
        <TabPanels height="100%">
          <TabPanel height="100%">
            {isDag && <DagContent />}
            {isDagRun && <DagRunContent runId={runId} />}
            {!!runId && !!taskId && (
              <>
                <BackToTaskSummary
                  isMapIndexDefined={mapIndex !== undefined && mapIndex > -1}
                  onClick={() => onSelect({ runId, taskId })}
                />
                <TaskInstanceContent
                  runId={runId}
                  taskId={taskId}
                  mapIndex={mapIndex}
                />
              </>
            )}
            {showTaskDetails && <TaskDetails />}
          </TabPanel>
          <TabPanel p={0} height="100%">
            <Graph
              openGroupIds={openGroupIds}
              onToggleGroups={onToggleGroups}
              hoveredTaskState={hoveredTaskState}
            />
          </TabPanel>
          <TabPanel p={0} height="100%">
            <Gantt
              openGroupIds={openGroupIds}
              gridScrollRef={gridScrollRef}
              ganttScrollRef={ganttScrollRef}
            />
          </TabPanel>
          <TabPanel height="100%">
            <DagCode />
          </TabPanel>
          {isTaskInstance && run && (
            <TabPanel
              pt={mapIndex !== undefined ? "0px" : undefined}
              height="100%"
            >
              <BackToTaskSummary
                isMapIndexDefined={mapIndex !== undefined}
                onClick={() => onSelect({ runId, taskId })}
              />
              <Logs
                dagId={dagId}
                dagRunId={runId}
                taskId={taskId}
                mapIndex={mapIndex}
                executionDate={run?.executionDate}
                tryNumber={instance?.tryNumber}
                state={
                  !instance?.state || instance?.state === "none"
                    ? undefined
                    : instance.state
                }
              />
            </TabPanel>
          )}
          {isMappedTaskSummary && (
            <TabPanel height="100%">
              <MappedInstances
                dagId={dagId}
                runId={runId}
                taskId={taskId}
                onRowClicked={(row) =>
                  onSelect({ runId, taskId, mapIndex: row.values.mapIndex })
                }
              />
            </TabPanel>
          )}
          {isTaskInstance && (
            <TabPanel height="100%">
              <XcomCollection
                dagId={dagId}
                dagRunId={runId}
                taskId={taskId}
                mapIndex={mapIndex}
                tryNumber={instance?.tryNumber}
              />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Flex>
  );
};

export default Details;

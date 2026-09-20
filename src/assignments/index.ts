import type { ComponentType } from 'react';
import { ResponsivePseudoScatterPlot } from './week-01/ResponsivePseudoScatterPlot';
import { DatasetSummary } from './week-02/DatasetSummary';
import { SubwayReliabilityChart } from './week-03/SubwayReliabilityChart';
import { SubwayReliabilityChartImproved } from './week-04/SubwayReliabilityChartImproved';
import { SubwayReliabilityInteractive } from './week-05/SubwayReliabilityInteractive';

export interface Assignment {
  id: string;
  name: string;
  component: ComponentType;
}

export const assignments: Assignment[] = [
  {
    id: '1',
    name: 'Week 1',
    component: ResponsivePseudoScatterPlot,
  },
  {
    id: '2',
    name: 'Week 2',
    component: DatasetSummary,
  },
  {
    id: '3',
    name: 'Week 3',
    component: SubwayReliabilityChart,
  },
  {
    id: '4',
    name: 'Week 4',
    component: SubwayReliabilityChartImproved,
  },
  {
    id: '5',
    name: 'Week 5',
    component: SubwayReliabilityInteractive,
  },
];

export const assignmentsMap = new Map(assignments.map((ex) => [ex.id, ex]));

export const defaultAssignment = '1';

import { useEffect, useState } from 'react';
import {
  csv,
  scaleBand,
  scaleLinear,
  max,
  mean,
} from 'd3';

type SubwayRow = {
  Month: string;
  Division: string;
  'Car Class': string;
  'Total Miles': string;
  'Number of Failures': string;
  'Number of Cars': string;
  MDBF: string;
  '12-Month Average MDBF': string;
};

type CarClassSummary = {
  carClass: string;
  averageMDBF: number;
};

export function SubwayReliabilityChart() {
  const [data, setData] = useState<CarClassSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    csv(
      `${import.meta.env.BASE_URL}data/mta-subway-reliability/mta-subway-reliability.csv`,
    ).then((rows) => {
      const subwayRows = rows as unknown as SubwayRow[];

      const grouped = new Map<string, number[]>();

      subwayRows.forEach((row) => {
        const carClass = row['Car Class'];

        const mdbf = Number(
          row.MDBF?.replace(/,/g, ''),
        );

        if (
          carClass &&
          !Number.isNaN(mdbf) &&
          mdbf > 0
        ) {
          if (!grouped.has(carClass)) {
            grouped.set(carClass, []);
          }

          grouped.get(carClass)?.push(mdbf);
        }
      });

      const summarizedData: CarClassSummary[] =
        Array.from(grouped.entries())
          .map(([carClass, values]) => ({
            carClass,
            averageMDBF: mean(values) ?? 0,
          }))
          .sort(
            (a, b) =>
              b.averageMDBF - a.averageMDBF,
          );

      setData(summarizedData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8">Loading data...</div>;
  }

  const width = 900;
  const height = 550;

  const margin = {
    top: 40,
    right: 30,
    bottom: 100,
    left: 100,
  };

  const innerWidth =
    width - margin.left - margin.right;

  const innerHeight =
    height - margin.top - margin.bottom;

  const xScale = scaleBand()
    .domain(data.map((d) => d.carClass))
    .range([0, innerWidth])
    .padding(0.2);

  const yScale = scaleLinear()
    .domain([
      0,
      max(data, (d) => d.averageMDBF) ?? 0,
    ])
    .nice()
    .range([innerHeight, 0]);

  const yTicks = yScale.ticks(5);

  return (
    <div className="p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-2">
        NYC Subway Car Reliability
      </h1>

      <p className="mb-6">
        Average Mean Distance Between Failures
        (MDBF) by subway car class.
      </p>

      <svg
        width={width}
        height={height}
        style={{ maxWidth: '100%' }}
      >
        <g
          transform={`translate(${margin.left}, ${margin.top})`}
        >
          {/* Y-axis grid lines and labels */}
          {yTicks.map((tick) => (
            <g
              key={tick}
              transform={`translate(0, ${yScale(tick)})`}
            >
              <line
                x1={0}
                x2={innerWidth}
                stroke="#ddd"
              />

              <text
                x={-10}
                y={5}
                textAnchor="end"
                fontSize={12}
              >
                {tick.toLocaleString()}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d) => (
            <rect
              key={d.carClass}
              x={xScale(d.carClass)}
              y={yScale(d.averageMDBF)}
              width={xScale.bandwidth()}
              height={
                innerHeight -
                yScale(d.averageMDBF)
              }
            />
          ))}

          {/* X-axis labels */}
          {data.map((d) => {
            const x =
              (xScale(d.carClass) ?? 0) +
              xScale.bandwidth() / 2;

            return (
              <text
                key={d.carClass}
                x={x}
                y={innerHeight + 20}
                textAnchor="end"
                transform={`rotate(-45, ${x}, ${
                  innerHeight + 20
                })`}
                fontSize={12}
              >
                {d.carClass}
              </text>
            );
          })}

          {/* X-axis title */}
          <text
            x={innerWidth / 2}
            y={innerHeight + 85}
            textAnchor="middle"
            fontSize={14}
          >
            Subway Car Class
          </text>

          {/* Y-axis title */}
          <text
            transform={`rotate(-90)`}
            x={-innerHeight / 2}
            y={-70}
            textAnchor="middle"
            fontSize={14}
          >
            Average MDBF (Miles)
          </text>
        </g>
      </svg>
    </div>
  );
}
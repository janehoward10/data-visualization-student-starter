import { useEffect, useState } from 'react';
import {
  csv,
  scaleBand,
  scaleLinear,
  max,
  mean,
  format,
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

type TooltipData = {
  x: number;
  y: number;
  carClass: string;
  averageMDBF: number;
} | null;

export function SubwayReliabilityChartImproved() {
  const [data, setData] = useState<CarClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData>(null);

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

  const width = 950;
  const height = 600;

  const margin = {
    top: 60,
    right: 30,
    bottom: 110,
    left: 100,
  };

  const innerWidth =
    width - margin.left - margin.right;

  const innerHeight =
    height - margin.top - margin.bottom;

  const xScale = scaleBand()
    .domain(data.map((d) => d.carClass))
    .range([0, innerWidth])
    .padding(0.25);

  const yScale = scaleLinear()
    .domain([
      0,
      max(data, (d) => d.averageMDBF) ?? 0,
    ])
    .nice()
    .range([innerHeight, 0]);

  const yTicks = yScale.ticks(5);

  const formatThousands = format('.2s');

  return (
    <div className="p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-2">
        NYC Subway Car Reliability by Car Class
      </h1>

      <p className="mb-1">
        Average Mean Distance Between Failures (MDBF)
      </p>

      <p className="mb-6 text-sm">
        Higher values indicate that a subway car class
        travels farther before experiencing a mechanical
        failure. Hover over a bar to see the exact average.
      </p>

      <div
        style={{
          position: 'relative',
          width: `${width}px`,
          maxWidth: '100%',
        }}
      >
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
                  {formatThousands(tick)}
                </text>
              </g>
            ))}

            {/* Bars */}
            {data.map((d) => {
              const x = xScale(d.carClass) ?? 0;
              const y = yScale(d.averageMDBF);

              return (
                <rect
                  key={d.carClass}
                  x={x}
                  y={y}
                  width={xScale.bandwidth()}
                  height={innerHeight - y}
                  onMouseEnter={() => {
                    setTooltip({
                      x:
                        margin.left +
                        x +
                        xScale.bandwidth() / 2,
                      y: margin.top + y,
                      carClass: d.carClass,
                      averageMDBF: d.averageMDBF,
                    });
                  }}
                  onMouseLeave={() => {
                    setTooltip(null);
                  }}
                  style={{
                    cursor: 'pointer',
                  }}
                />
              );
            })}

            {/* Value labels above bars */}
            {data.map((d) => {
              const x =
                (xScale(d.carClass) ?? 0) +
                xScale.bandwidth() / 2;

              return (
                <text
                  key={`${d.carClass}-value`}
                  x={x}
                  y={yScale(d.averageMDBF) - 8}
                  textAnchor="middle"
                  fontSize={11}
                >
                  {formatThousands(d.averageMDBF)}
                </text>
              );
            })}

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
              y={innerHeight + 95}
              textAnchor="middle"
              fontSize={14}
              fontWeight="bold"
            >
              Subway Car Class
            </text>

            {/* Y-axis title */}
            <text
              transform="rotate(-90)"
              x={-innerHeight / 2}
              y={-70}
              textAnchor="middle"
              fontSize={14}
              fontWeight="bold"
            >
              Average MDBF (Miles)
            </text>
          </g>
        </svg>

        {/* Visible hover tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y - 70,
              transform: 'translateX(-50%)',
              background: 'white',
              border: '1px solid #999',
              borderRadius: '6px',
              padding: '8px 10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            <strong>{tooltip.carClass}</strong>
            <br />
            Average MDBF:{' '}
            {Math.round(
              tooltip.averageMDBF,
            ).toLocaleString()}{' '}
            miles
          </div>
        )}
      </div>
    </div>
  );
}
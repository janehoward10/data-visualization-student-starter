import {
    useEffect,
    useMemo,
    useState,
  } from 'react';
  
  import {
    csv,
    extent,
    scaleLinear,
  } from 'd3';
  
  type HospitalRow = {
    'Facility ID': string;
    'Facility Name': string;
    'City/Town': string;
    State: string;
    'Hospital Type': string;
    'Hospital overall rating': string;
  
    'Count of MORT Measures Better': string;
    'Count of Safety Measures Better': string;
    'Count of READM Measures Better': string;
  };
  
  type HospitalPoint = {
    id: string;
    name: string;
    city: string;
    state: string;
    type: string;
  
    overallRating: number;
    mortalityBetter: number;
    safetyBetter: number;
    readmissionBetter: number;
  };
  
  type VariableKey =
    | 'overallRating'
    | 'mortalityBetter'
    | 'safetyBetter'
    | 'readmissionBetter';
  
  type VariableDefinition = {
    key: VariableKey;
    label: string;
    shortLabel: string;
  };
  
  type BrushSelection = {
    cellKey: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  
  const variables: VariableDefinition[] = [
    {
      key: 'overallRating',
      label: 'Overall CMS Rating',
      shortLabel: 'Overall Rating',
    },
    {
      key: 'mortalityBetter',
      label: 'Mortality Measures Better',
      shortLabel: 'Mortality Better',
    },
    {
      key: 'safetyBetter',
      label: 'Safety Measures Better',
      shortLabel: 'Safety Better',
    },
    {
      key: 'readmissionBetter',
      label: 'Readmission Measures Better',
      shortLabel: 'Readmission Better',
    },
  ];
  
  function getRatingColor(rating: number) {
    if (rating === 5) return '#247a5a';
    if (rating === 4) return '#55a36d';
    if (rating === 3) return '#d4a72c';
    if (rating === 2) return '#d97941';
  
    return '#b84a4a';
  }
  
  export function HospitalBrushableMatrix() {
    const [rawData, setRawData] = useState<
      HospitalRow[]
    >([]);
  
    const [loading, setLoading] =
      useState(true);
  
    // Start with Massachusetts so the visualization
    // stays readable and is easy to inspect.
    const [selectedState, setSelectedState] =
      useState('MA');
  
    const [brush, setBrush] =
      useState<BrushSelection>(null);
  
    const [selectedIds, setSelectedIds] =
      useState<Set<string> | null>(null);
  
    useEffect(() => {
      csv(
        `${import.meta.env.BASE_URL}data/hospital-quality/hospital-general-information.csv`,
      )
        .then((rows) => {
          setRawData(
            rows as unknown as HospitalRow[],
          );
  
          setLoading(false);
        })
        .catch((error) => {
          console.error(
            'Error loading hospital data:',
            error,
          );
  
          setLoading(false);
        });
    }, []);
  
    const states = useMemo(() => {
      return Array.from(
        new Set(
          rawData
            .map((d) => d.State)
            .filter(Boolean),
        ),
      ).sort();
    }, [rawData]);
  
    const data = useMemo(() => {
      return rawData
        .filter((d) => {
          if (
            selectedState !== 'All States' &&
            d.State !== selectedState
          ) {
            return false;
          }
  
          const rating = Number(
            d['Hospital overall rating'],
          );
  
          return (
            !Number.isNaN(rating) &&
            rating >= 1 &&
            rating <= 5
          );
        })
        .map(
          (d): HospitalPoint => ({
            id: d['Facility ID'],
            name: d['Facility Name'],
            city: d['City/Town'],
            state: d.State,
            type: d['Hospital Type'],
  
            overallRating: Number(
              d['Hospital overall rating'],
            ),
  
            mortalityBetter:
              Number(
                d[
                  'Count of MORT Measures Better'
                ],
              ) || 0,
  
            safetyBetter:
              Number(
                d[
                  'Count of Safety Measures Better'
                ],
              ) || 0,
  
            readmissionBetter:
              Number(
                d[
                  'Count of READM Measures Better'
                ],
              ) || 0,
          }),
        );
    }, [rawData, selectedState]);
  
    // Clear brushing whenever the user changes state.
    useEffect(() => {
      setBrush(null);
      setSelectedIds(null);
    }, [selectedState]);
  
    const cellSize = 190;
    const cellPadding = 28;
  
    const matrixSize =
      cellSize * variables.length;
  
    const scales = useMemo(() => {
      const map = new Map<
        VariableKey,
        ReturnType<typeof scaleLinear>
      >();
  
      variables.forEach((variable) => {
        const values = data.map(
          (d) => d[variable.key],
        );
  
        const [minimum = 0, maximum = 1] =
          extent(values);
  
        // Give the scale a small amount of
        // breathing room when min = max.
        const adjustedMaximum =
          maximum === minimum
            ? maximum + 1
            : maximum;
  
        map.set(
          variable.key,
          scaleLinear()
            .domain([
              minimum,
              adjustedMaximum,
            ])
            .nice()
            .range([
              cellPadding,
              cellSize - cellPadding,
            ]),
        );
      });
  
      return map;
    }, [data]);
  
    function updateSelection(
      xVariable: VariableDefinition,
      yVariable: VariableDefinition,
      currentBrush: NonNullable<BrushSelection>,
    ) {
      const xScale = scales.get(
        xVariable.key,
      );
  
      const yScale = scales.get(
        yVariable.key,
      );
  
      if (!xScale || !yScale) return;
  
      const left = Math.min(
        currentBrush.startX,
        currentBrush.endX,
      );
  
      const right = Math.max(
        currentBrush.startX,
        currentBrush.endX,
      );
  
      const top = Math.min(
        currentBrush.startY,
        currentBrush.endY,
      );
  
      const bottom = Math.max(
        currentBrush.startY,
        currentBrush.endY,
      );
  
      const ids = new Set<string>();
  
      data.forEach((hospital) => {
        const x = xScale(
          hospital[xVariable.key],
        );
  
        // SVG y coordinates increase downward,
        // so invert the scale visually.
        const y =
          cellSize -
          yScale(
            hospital[yVariable.key],
          );
  
        if (
          x >= left &&
          x <= right &&
          y >= top &&
          y <= bottom
        ) {
          ids.add(hospital.id);
        }
      });
  
      setSelectedIds(ids);
    }
  
    const selectedHospitals =
      selectedIds === null
        ? []
        : data.filter((d) =>
            selectedIds.has(d.id),
          );
  
    if (loading) {
      return (
        <div style={{ padding: '40px' }}>
          Loading hospital data...
        </div>
      );
    }
  
    return (
      <div
        style={{
          width: '100%',
          alignSelf: 'stretch',
          minHeight: '100vh',
          background: '#f7f9fc',
          padding: '40px 32px 60px',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 750,
              marginBottom: '8px',
            }}
          >
            Hospital Quality Brushable
            Scatterplot Matrix
          </h1>
  
          <p
            style={{
              fontSize: '17px',
              marginBottom: '6px',
            }}
          >
            Explore relationships between
            several CMS hospital quality
            measures.
          </p>
  
          <p
            style={{
              color: '#4b5563',
              maxWidth: '820px',
              lineHeight: 1.5,
              marginBottom: '24px',
            }}
          >
            Drag across any scatterplot to
            select hospitals. The same hospitals
            will remain highlighted across every
            other view in the matrix.
          </p>
  
          {/* Controls */}
          <div
            style={{
              background: 'white',
              border: '1px solid #d9e0e8',
              borderRadius: '10px',
              padding: '18px',
              marginBottom: '22px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'end',
              gap: '18px',
            }}
          >
            <label>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '5px',
                }}
              >
                State
              </div>
  
              <select
                value={selectedState}
                onChange={(event) =>
                  setSelectedState(
                    event.target.value,
                  )
                }
                style={{
                  padding: '8px',
                  minWidth: '160px',
                }}
              >
                <option value="All States">
                  All States
                </option>
  
                {states.map((state) => (
                  <option
                    key={state}
                    value={state}
                  >
                    {state}
                  </option>
                ))}
              </select>
            </label>
  
            <button
              onClick={() => {
                setBrush(null);
                setSelectedIds(null);
              }}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                border:
                  '1px solid #94a3b8',
                borderRadius: '5px',
                background: 'white',
              }}
            >
              Clear Selection
            </button>
  
            <div
              style={{
                marginLeft: 'auto',
                fontSize: '14px',
                background: '#eef3f7',
                padding: '8px 12px',
                borderRadius: '6px',
              }}
            >
              {selectedIds === null ? (
                <>
                  <strong>
                    {data.length}
                  </strong>{' '}
                  hospitals shown
                </>
              ) : (
                <>
                  <strong>
                    {selectedIds.size}
                  </strong>{' '}
                  hospitals selected
                </>
              )}
            </div>
          </div>
  
          {/* Scatterplot matrix */}
          <div
            style={{
              background: 'white',
              border: '1px solid #d9e0e8',
              borderRadius: '10px',
              padding: '22px',
              overflowX: 'auto',
            }}
          >
            <svg
              width={matrixSize}
              height={matrixSize}
            >
              {variables.map(
                (yVariable, rowIndex) =>
                  variables.map(
                    (
                      xVariable,
                      columnIndex,
                    ) => {
                      const xOffset =
                        columnIndex *
                        cellSize;
  
                      const yOffset =
                        rowIndex *
                        cellSize;
  
                      const cellKey = `${xVariable.key}-${yVariable.key}`;
  
                      const isDiagonal =
                        xVariable.key ===
                        yVariable.key;
  
                      const xScale =
                        scales.get(
                          xVariable.key,
                        );
  
                      const yScale =
                        scales.get(
                          yVariable.key,
                        );
  
                      if (
                        !xScale ||
                        !yScale
                      ) {
                        return null;
                      }
  
                      const activeBrush =
                        brush?.cellKey ===
                        cellKey
                          ? brush
                          : null;
  
                      return (
                        <g
                          key={cellKey}
                          transform={`translate(${xOffset}, ${yOffset})`}
                        >
                          {/* Cell border */}
                          <rect
                            x={1}
                            y={1}
                            width={
                              cellSize - 2
                            }
                            height={
                              cellSize - 2
                            }
                            fill="#ffffff"
                            stroke="#d8dee7"
                          />
  
                          {isDiagonal ? (
                            <>
                              <rect
                                x={1}
                                y={1}
                                width={
                                  cellSize -
                                  2
                                }
                                height={
                                  cellSize -
                                  2
                                }
                                fill="#f3f6f9"
                              />
  
                              <text
                                x={
                                  cellSize /
                                  2
                                }
                                y={
                                  cellSize /
                                    2 -
                                  5
                                }
                                textAnchor="middle"
                                fontSize={13}
                                fontWeight="bold"
                              >
                                {
                                  xVariable.shortLabel
                                }
                              </text>
  
                              <text
                                x={
                                  cellSize /
                                  2
                                }
                                y={
                                  cellSize /
                                    2 +
                                  17
                                }
                                textAnchor="middle"
                                fontSize={11}
                                fill="#64748b"
                              >
                                {
                                  data.length
                                }{' '}
                                hospitals
                              </text>
                            </>
                          ) : (
                            <>
                              {/* Points */}
                              {data.map(
                                (
                                  hospital,
                                ) => {
                                  const x =
                                    xScale(
                                      hospital[
                                        xVariable
                                          .key
                                      ],
                                    );
  
                                  const y =
                                    cellSize -
                                    yScale(
                                      hospital[
                                        yVariable
                                          .key
                                      ],
                                    );
  
                                  const selected =
                                    selectedIds ===
                                      null ||
                                    selectedIds.has(
                                      hospital.id,
                                    );
  
                                  return (
                                    <circle
                                      key={
                                        hospital.id
                                      }
                                      cx={x}
                                      cy={y}
                                      r={
                                        selected
                                          ? 4
                                          : 3
                                      }
                                      fill={getRatingColor(
                                        hospital.overallRating,
                                      )}
                                      opacity={
                                        selected
                                          ? 0.8
                                          : 0.08
                                      }
                                      pointerEvents="none"
                                    />
                                  );
                                },
                              )}
  
                              {/* Brush rectangle */}
                              {activeBrush && (
                                <rect
                                  x={Math.min(
                                    activeBrush.startX,
                                    activeBrush.endX,
                                  )}
                                  y={Math.min(
                                    activeBrush.startY,
                                    activeBrush.endY,
                                  )}
                                  width={Math.abs(
                                    activeBrush.endX -
                                      activeBrush.startX,
                                  )}
                                  height={Math.abs(
                                    activeBrush.endY -
                                      activeBrush.startY,
                                  )}
                                  fill="#4f78a8"
                                  fillOpacity={
                                    0.15
                                  }
                                  stroke="#315f8f"
                                  strokeWidth={
                                    1.5
                                  }
                                  pointerEvents="none"
                                />
                              )}
  
                              {/* Transparent interaction layer */}
                              <rect
                                x={0}
                                y={0}
                                width={
                                  cellSize
                                }
                                height={
                                  cellSize
                                }
                                fill="transparent"
                                style={{
                                  cursor:
                                    'crosshair',
                                }}
                                onPointerDown={(
                                  event,
                                ) => {
                                  const rect =
                                    event.currentTarget.getBoundingClientRect();
  
                                  const x =
                                    event.clientX -
                                    rect.left;
  
                                  const y =
                                    event.clientY -
                                    rect.top;
  
                                  const newBrush =
                                    {
                                      cellKey,
                                      startX:
                                        x,
                                      startY:
                                        y,
                                      endX:
                                        x,
                                      endY:
                                        y,
                                    };
  
                                  setBrush(
                                    newBrush,
                                  );
  
                                  setSelectedIds(
                                    new Set(),
                                  );
  
                                  event.currentTarget.setPointerCapture(
                                    event.pointerId,
                                  );
                                }}
                                onPointerMove={(
                                  event,
                                ) => {
                                  if (
                                    !brush ||
                                    brush.cellKey !==
                                      cellKey
                                  ) {
                                    return;
                                  }
  
                                  const rect =
                                    event.currentTarget.getBoundingClientRect();
  
                                  const x =
                                    event.clientX -
                                    rect.left;
  
                                  const y =
                                    event.clientY -
                                    rect.top;
  
                                  const updatedBrush =
                                    {
                                      ...brush,
                                      endX:
                                        Math.max(
                                          0,
                                          Math.min(
                                            cellSize,
                                            x,
                                          ),
                                        ),
                                      endY:
                                        Math.max(
                                          0,
                                          Math.min(
                                            cellSize,
                                            y,
                                          ),
                                        ),
                                    };
  
                                  setBrush(
                                    updatedBrush,
                                  );
  
                                  updateSelection(
                                    xVariable,
                                    yVariable,
                                    updatedBrush,
                                  );
                                }}
                                onPointerUp={(
                                  event,
                                ) => {
                                  if (
                                    brush &&
                                    brush.cellKey ===
                                      cellKey
                                  ) {
                                    updateSelection(
                                      xVariable,
                                      yVariable,
                                      brush,
                                    );
                                  }
  
                                  event.currentTarget.releasePointerCapture(
                                    event.pointerId,
                                  );
                                }}
                              />
  
                              {/* X variable label */}
                              {rowIndex ===
                                variables.length -
                                  1 && (
                                <text
                                  x={
                                    cellSize /
                                    2
                                  }
                                  y={
                                    cellSize -
                                    5
                                  }
                                  textAnchor="middle"
                                  fontSize={
                                    10
                                  }
                                  fill="#475569"
                                  pointerEvents="none"
                                >
                                  {
                                    xVariable.shortLabel
                                  }
                                </text>
                              )}
  
                              {/* Y variable label */}
                              {columnIndex ===
                                0 && (
                                <text
                                  transform={`translate(12, ${
                                    cellSize /
                                    2
                                  }) rotate(-90)`}
                                  textAnchor="middle"
                                  fontSize={
                                    10
                                  }
                                  fill="#475569"
                                  pointerEvents="none"
                                >
                                  {
                                    yVariable.shortLabel
                                  }
                                </text>
                              )}
                            </>
                          )}
                        </g>
                      );
                    },
                  ),
              )}
            </svg>
          </div>
  
          {/* Selected hospital list */}
          {selectedIds !== null && (
            <div
              style={{
                background: 'white',
                border:
                  '1px solid #d9e0e8',
                borderRadius: '10px',
                padding: '20px',
                marginTop: '22px',
              }}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                Selected Hospitals
              </h2>
  
              {selectedHospitals.length ===
              0 ? (
                <p>
                  No hospitals fall within
                  the current brush selection.
                </p>
              ) : (
                <>
                  <p
                    style={{
                      color: '#64748b',
                      fontSize: '13px',
                      marginBottom:
                        '12px',
                    }}
                  >
                    Showing up to the first
                    10 selected hospitals.
                  </p>
  
                  {selectedHospitals
                    .slice(0, 10)
                    .map((hospital) => (
                      <div
                        key={
                          hospital.id
                        }
                        style={{
                          padding:
                            '8px 0',
                          borderBottom:
                            '1px solid #e5e7eb',
                        }}
                      >
                        <strong>
                          {hospital.name}
                        </strong>
  
                        <span
                          style={{
                            color:
                              '#64748b',
                          }}
                        >
                          {' '}
                          —{' '}
                          {hospital.city},{' '}
                          {
                            hospital.state
                          }{' '}
                          — CMS Rating{' '}
                          {
                            hospital.overallRating
                          }
                          /5
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
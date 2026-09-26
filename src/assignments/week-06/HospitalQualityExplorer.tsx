import { useEffect, useMemo, useState } from 'react';
import {
  csv,
  scaleBand,
  scaleLinear,
} from 'd3';

type HospitalRow = {
  'Facility ID': string;
  'Facility Name': string;
  Address: string;
  'City/Town': string;
  State: string;
  'ZIP Code': string;
  'County/Parish': string;
  'Telephone Number': string;
  'Hospital Type': string;
  'Hospital Ownership': string;
  'Emergency Services': string;
  'Meets criteria for birthing friendly designation': string;
  'Hospital overall rating': string;
  'Hospital overall rating footnote': string;

  'Count of Facility MORT Measures': string;
  'Count of MORT Measures Better': string;
  'Count of MORT Measures No Different': string;
  'Count of MORT Measures Worse': string;

  'Count of Facility Safety Measures': string;
  'Count of Safety Measures Better': string;
  'Count of Safety Measures No Different': string;
  'Count of Safety Measures Worse': string;

  'Count of Facility READM Measures': string;
  'Count of READM Measures Better': string;
  'Count of READM Measures No Different': string;
  'Count of READM Measures Worse': string;

  'Count of Facility Pt Exp Measures': string;
};

type TooltipData = {
  x: number;
  y: number;
  hospital: HospitalRow;
} | null;

function getRatingColor(rating: number) {
  if (rating === 5) return '#247a5a';
  if (rating === 4) return '#55a36d';
  if (rating === 3) return '#d4a72c';
  if (rating === 2) return '#d97941';
  return '#b84a4a';
}

export function HospitalQualityExplorer() {
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedState, setSelectedState] = useState('MA');
  const [selectedType, setSelectedType] =
    useState('All Types');
  const [searchText, setSearchText] = useState('');
  const [selectedHospital, setSelectedHospital] =
    useState<HospitalRow | null>(null);
  const [tooltip, setTooltip] =
    useState<TooltipData>(null);

  useEffect(() => {
    csv(
      `${import.meta.env.BASE_URL}data/hospital-quality/hospital-general-information.csv`,
    )
      .then((rows) => {
        setHospitals(
          rows as unknown as HospitalRow[],
        );
        setLoading(false);
      })
      .catch((error) => {
        console.error(
          'Error loading hospital dataset:',
          error,
        );
        setLoading(false);
      });
  }, []);

  const states = useMemo(() => {
    return Array.from(
      new Set(
        hospitals
          .map((hospital) => hospital.State)
          .filter(Boolean),
      ),
    ).sort();
  }, [hospitals]);

  const hospitalTypes = useMemo(() => {
    return Array.from(
      new Set(
        hospitals
          .map(
            (hospital) =>
              hospital['Hospital Type'],
          )
          .filter(Boolean),
      ),
    ).sort();
  }, [hospitals]);

  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter((hospital) => {
        const rating = Number(
          hospital['Hospital overall rating'],
        );

        const hasValidRating =
          !Number.isNaN(rating) &&
          rating >= 1 &&
          rating <= 5;

        const matchesState =
          selectedState === 'All States' ||
          hospital.State === selectedState;

        const matchesType =
          selectedType === 'All Types' ||
          hospital['Hospital Type'] ===
            selectedType;

        const search =
          searchText.trim().toLowerCase();

        const matchesSearch =
          search === '' ||
          hospital['Facility Name']
            .toLowerCase()
            .includes(search) ||
          hospital['City/Town']
            .toLowerCase()
            .includes(search);

        return (
          hasValidRating &&
          matchesState &&
          matchesType &&
          matchesSearch
        );
      })
      .sort((a, b) => {
        const ratingDifference =
          Number(
            b['Hospital overall rating'],
          ) -
          Number(
            a['Hospital overall rating'],
          );

        if (ratingDifference !== 0) {
          return ratingDifference;
        }

        return a['Facility Name'].localeCompare(
          b['Facility Name'],
        );
      });
  }, [
    hospitals,
    selectedState,
    selectedType,
    searchText,
  ]);

  const chartHospitals =
    filteredHospitals.slice(0, 20);

  const width = 920;
  const rowHeight = 36;

  const margin = {
    top: 20,
    right: 80,
    bottom: 55,
    left: 285,
  };

  const innerWidth =
    width - margin.left - margin.right;

  const innerHeight = Math.max(
    chartHospitals.length * rowHeight,
    100,
  );

  const height =
    innerHeight +
    margin.top +
    margin.bottom;

  const xScale = scaleLinear()
    .domain([0, 5])
    .range([0, innerWidth]);

  const yScale = scaleBand()
    .domain(
      chartHospitals.map(
        (hospital) =>
          hospital['Facility ID'],
      ),
    )
    .range([0, innerHeight])
    .padding(0.22);

  const xTicks = [1, 2, 3, 4, 5];

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          alignSelf: 'stretch',
          padding: '40px',
        }}
      >
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
        padding: '40px 32px 60px',
        background: '#f7f9fc',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            marginBottom: '28px',
          }}
        >
          <h1
            style={{
              fontSize: '34px',
              fontWeight: 750,
              margin: 0,
              marginBottom: '8px',
            }}
          >
            U.S. Hospital Quality Explorer
          </h1>

          <p
            style={{
              fontSize: '18px',
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Explore and compare overall CMS
            hospital quality ratings.
          </p>

          <p
            style={{
              fontSize: '14px',
              maxWidth: '820px',
              lineHeight: 1.5,
              color: '#4b5563',
              margin: 0,
            }}
          >
            CMS hospital ratings range from 1
            to 5 stars. Higher ratings indicate
            stronger overall performance across
            the measures included in the CMS
            hospital rating methodology.
          </p>
        </div>

        <div
          style={{
            background: 'white',
            border: '1px solid #d9e0e8',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '22px',
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
              alignItems: 'end',
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
                onChange={(event) => {
                  setSelectedState(
                    event.target.value,
                  );
                  setSelectedHospital(null);
                }}
                style={{
                  padding: '9px',
                  minWidth: '155px',
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

            <label>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '5px',
                }}
              >
                Hospital Type
              </div>

              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(
                    event.target.value,
                  );
                  setSelectedHospital(null);
                }}
                style={{
                  padding: '9px',
                  minWidth: '240px',
                }}
              >
                <option value="All Types">
                  All Types
                </option>

                {hospitalTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '5px',
                }}
              >
                Search Hospital or City
              </div>

              <input
                type="text"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value,
                  )
                }
                placeholder="e.g. Boston"
                style={{
                  padding: '9px',
                  minWidth: '230px',
                  border: '1px solid #999',
                  borderRadius: '4px',
                }}
              />
            </label>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            border: '1px solid #d9e0e8',
            borderRadius: '10px',
            padding: '22px',
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'start',
              gap: '20px',
              flexWrap: 'wrap',
              marginBottom: '12px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: '4px',
                }}
              >
                Hospital Overall Rating
              </h2>

              <p
                style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  margin: 0,
                }}
              >
                Ranked by CMS overall rating.
                Hover for details and click a
                hospital to inspect it.
              </p>
            </div>

            <div
              style={{
                fontSize: '14px',
                padding: '8px 12px',
                background: '#eef3f7',
                borderRadius: '6px',
              }}
            >
              <strong>
                {filteredHospitals.length}
              </strong>{' '}
              hospitals match filters
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '14px',
              fontSize: '12px',
            }}
          >
            {[1, 2, 3, 4, 5].map(
              (rating) => (
                <div
                  key={rating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      background:
                        getRatingColor(
                          rating,
                        ),
                      display:
                        'inline-block',
                      borderRadius: '2px',
                    }}
                  />
                  {rating} star
                </div>
              ),
            )}
          </div>

          {filteredHospitals.length > 20 && (
            <p
              style={{
                marginBottom: '10px',
                fontSize: '13px',
                color: '#6b7280',
              }}
            >
              Showing the first 20 hospitals
              in the current ranked results.
            </p>
          )}

          <div
            style={{
              position: 'relative',
              width: `${width}px`,
              maxWidth: '100%',
            }}
          >
            {chartHospitals.length === 0 ? (
              <div
                style={{
                  padding: '30px',
                  border: '1px solid #ddd',
                }}
              >
                No hospitals match the current
                filters.
              </div>
            ) : (
              <svg
                width={width}
                height={height}
                style={{
                  maxWidth: '100%',
                }}
              >
                <g
                  transform={`translate(${margin.left}, ${margin.top})`}
                >
                  {xTicks.map((tick) => (
                    <g
                      key={tick}
                      transform={`translate(${xScale(
                        tick,
                      )}, 0)`}
                    >
                      <line
                        y1={0}
                        y2={innerHeight}
                        stroke="#e5e7eb"
                      />

                      <text
                        x={0}
                        y={
                          innerHeight +
                          28
                        }
                        textAnchor="middle"
                        fontSize={12}
                      >
                        {tick}
                      </text>
                    </g>
                  ))}

                  {chartHospitals.map(
                    (hospital) => {
                      const rating = Number(
                        hospital[
                          'Hospital overall rating'
                        ],
                      );

                      const y =
                        yScale(
                          hospital[
                            'Facility ID'
                          ],
                        ) ?? 0;

                      const barHeight =
                        yScale.bandwidth();

                      const isSelected =
                        selectedHospital?.[
                          'Facility ID'
                        ] ===
                        hospital[
                          'Facility ID'
                        ];

                      return (
                        <g
                          key={
                            hospital[
                              'Facility ID'
                            ]
                          }
                        >
                          <text
                            x={-12}
                            y={
                              y +
                              barHeight / 2 +
                              4
                            }
                            textAnchor="end"
                            fontSize={12}
                            fontWeight={
                              isSelected
                                ? 'bold'
                                : 'normal'
                            }
                          >
                            {
                              hospital[
                                'Facility Name'
                              ]
                            }
                          </text>

                          <rect
                            x={0}
                            y={y}
                            width={xScale(
                              rating,
                            )}
                            height={
                              barHeight
                            }
                            fill={getRatingColor(
                              rating,
                            )}
                            opacity={
                              isSelected
                                ? 1
                                : 0.82
                            }
                            stroke={
                              isSelected
                                ? '#111827'
                                : 'none'
                            }
                            strokeWidth={
                              isSelected
                                ? 3
                                : 0
                            }
                            rx={3}
                            style={{
                              cursor:
                                'pointer',
                            }}
                            onClick={() =>
                              setSelectedHospital(
                                hospital,
                              )
                            }
                            onMouseEnter={() => {
                              setTooltip({
                                x:
                                  margin.left +
                                  xScale(
                                    rating,
                                  ),
                                y:
                                  margin.top +
                                  y,
                                hospital,
                              });
                            }}
                            onMouseLeave={() =>
                              setTooltip(
                                null,
                              )
                            }
                          />

                          <text
                            x={
                              xScale(
                                rating,
                              ) + 8
                            }
                            y={
                              y +
                              barHeight / 2 +
                              4
                            }
                            fontSize={12}
                            fontWeight="bold"
                          >
                            {rating}/5
                          </text>
                        </g>
                      );
                    },
                  )}

                  <text
                    x={
                      innerWidth / 2
                    }
                    y={
                      innerHeight +
                      48
                    }
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight="bold"
                  >
                    CMS Overall Hospital Rating
                  </text>
                </g>
              </svg>
            )}

            {tooltip && (
              <div
                style={{
                  position: 'absolute',
                  left: tooltip.x,
                  top:
                    tooltip.y - 75,
                  transform:
                    'translateX(-50%)',
                  background: '#111827',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '9px 11px',
                  boxShadow:
                    '0 3px 8px rgba(0,0,0,0.25)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  zIndex: 10,
                }}
              >
                <strong>
                  {
                    tooltip.hospital[
                      'Facility Name'
                    ]
                  }
                </strong>

                <br />

                {
                  tooltip.hospital[
                    'City/Town'
                  ]
                }
                , {tooltip.hospital.State}

                <br />

                CMS Rating:{' '}
                {
                  tooltip.hospital[
                    'Hospital overall rating'
                  ]
                }
                /5
              </div>
            )}
          </div>
        </div>

        {selectedHospital && (
          <div
            style={{
              marginTop: '24px',
              padding: '24px',
              background: 'white',
              border: '1px solid #d9e0e8',
              borderRadius: '10px',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: '20px',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#247a5a',
                    marginBottom: '4px',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.05em',
                  }}
                >
                  Selected Hospital
                </div>

                <h2
                  style={{
                    fontSize: '25px',
                    fontWeight: 750,
                    margin: 0,
                  }}
                >
                  {
                    selectedHospital[
                      'Facility Name'
                    ]
                  }
                </h2>

                <p
                  style={{
                    color: '#4b5563',
                    marginTop: '4px',
                  }}
                >
                  {
                    selectedHospital[
                      'City/Town'
                    ]
                  }
                  ,{' '}
                  {
                    selectedHospital.State
                  }
                </p>
              </div>

              <div
                style={{
                  background:
                    getRatingColor(
                      Number(
                        selectedHospital[
                          'Hospital overall rating'
                        ],
                      ),
                    ),
                  color: 'white',
                  borderRadius: '8px',
                  padding: '12px 18px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                  }}
                >
                  CMS Rating
                </div>

                <div
                  style={{
                    fontSize: '25px',
                    fontWeight: 750,
                  }}
                >
                  {
                    selectedHospital[
                      'Hospital overall rating'
                    ]
                  }
                  /5
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '14px',
                marginBottom: '26px',
              }}
            >
              <InfoCard
                label="Hospital Type"
                value={
                  selectedHospital[
                    'Hospital Type'
                  ]
                }
              />

              <InfoCard
                label="Ownership"
                value={
                  selectedHospital[
                    'Hospital Ownership'
                  ]
                }
              />

              <InfoCard
                label="Emergency Services"
                value={
                  selectedHospital[
                    'Emergency Services'
                  ]
                }
              />

              <InfoCard
                label="Patient Experience Measures"
                value={
                  selectedHospital[
                    'Count of Facility Pt Exp Measures'
                  ] || 'N/A'
                }
              />
            </div>

            <h3
              style={{
                fontSize: '19px',
                fontWeight: 700,
                marginBottom: '5px',
              }}
            >
              Quality Measure Summary
            </h3>

            <p
              style={{
                fontSize: '13px',
                color: '#4b5563',
                marginBottom: '15px',
              }}
            >
              Number of CMS measures classified
              as better, no different, or worse
              than the comparison benchmark.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
              }}
            >
              <QualityCard
                title="Mortality"
                better={
                  selectedHospital[
                    'Count of MORT Measures Better'
                  ]
                }
                same={
                  selectedHospital[
                    'Count of MORT Measures No Different'
                  ]
                }
                worse={
                  selectedHospital[
                    'Count of MORT Measures Worse'
                  ]
                }
              />

              <QualityCard
                title="Safety"
                better={
                  selectedHospital[
                    'Count of Safety Measures Better'
                  ]
                }
                same={
                  selectedHospital[
                    'Count of Safety Measures No Different'
                  ]
                }
                worse={
                  selectedHospital[
                    'Count of Safety Measures Worse'
                  ]
                }
              />

              <QualityCard
                title="Readmissions"
                better={
                  selectedHospital[
                    'Count of READM Measures Better'
                  ]
                }
                same={
                  selectedHospital[
                    'Count of READM Measures No Different'
                  ]
                }
                worse={
                  selectedHospital[
                    'Count of READM Measures Worse'
                  ]
                }
              />
            </div>

            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop:
                  '1px solid #e5e7eb',
                fontSize: '13px',
                color: '#4b5563',
              }}
            >
              <strong>Address:</strong>{' '}
              {selectedHospital.Address},{' '}
              {
                selectedHospital[
                  'City/Town'
                ]
              }
              , {selectedHospital.State}{' '}
              {
                selectedHospital[
                  'ZIP Code'
                ]
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: '15px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '7px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#64748b',
          marginBottom: '5px',
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
        }}
      >
        {value || 'N/A'}
      </div>
    </div>
  );
}

function QualityCard({
  title,
  better,
  same,
  worse,
}: {
  title: string;
  better: string;
  same: string;
  worse: string;
}) {
  return (
    <div
      style={{
        padding: '16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '7px',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: '10px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          marginBottom: '5px',
        }}
      >
        <span>Better</span>
        <strong style={{ color: '#247a5a' }}>
          {better || '0'}
        </strong>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          marginBottom: '5px',
        }}
      >
        <span>No Different</span>
        <strong>
          {same || '0'}
        </strong>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
        }}
      >
        <span>Worse</span>
        <strong style={{ color: '#b84a4a' }}>
          {worse || '0'}
        </strong>
      </div>
    </div>
  );
}
import {
    useEffect,
    useMemo,
    useState,
  } from 'react';
  
  import {
    csv,
    mean,
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
    'Hospital Type': string;
    'Hospital Ownership': string;
    'Emergency Services': string;
    'Hospital overall rating': string;
  
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
  
  function numberValue(value: string) {
    const parsed = Number(value);
  
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  
  function percentBetter(
    better: string,
    total: string,
  ) {
    const betterValue = numberValue(better);
    const totalValue = numberValue(total);
  
    if (totalValue === 0) {
      return 0;
    }
  
    return (betterValue / totalValue) * 100;
  }
  
  export function HospitalQualityExplorerV2() {
    const [hospitals, setHospitals] =
      useState<HospitalRow[]>([]);
  
    const [loading, setLoading] =
      useState(true);
  
    const [selectedState, setSelectedState] =
      useState('MA');
  
    const [selectedType, setSelectedType] =
      useState('All Types');
  
    const [searchText, setSearchText] =
      useState('');
  
    const [selectedHospital, setSelectedHospital] =
      useState<HospitalRow | null>(null);
  
    const [tooltip, setTooltip] =
      useState<TooltipData>(null);
  
    // New Week 8 feature: pagination.
    const [page, setPage] = useState(1);
  
    const pageSize = 10;
  
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
            'Error loading hospital data:',
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
  
          const validRating =
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
            validRating &&
            matchesState &&
            matchesType &&
            matchesSearch
          );
        })
        .sort((a, b) => {
          const ratingDifference =
            numberValue(
              b['Hospital overall rating'],
            ) -
            numberValue(
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
  
    // Go back to page 1 whenever filters change.
    useEffect(() => {
      setPage(1);
    }, [
      selectedState,
      selectedType,
      searchText,
    ]);
  
    const totalPages = Math.max(
      1,
      Math.ceil(
        filteredHospitals.length / pageSize,
      ),
    );
  
    const pageHospitals =
      filteredHospitals.slice(
        (page - 1) * pageSize,
        page * pageSize,
      );
  
    // Comparison baseline for Week 8.
    const comparisonStats = useMemo(() => {
      const rating =
        mean(
          filteredHospitals,
          (hospital) =>
            numberValue(
              hospital[
                'Hospital overall rating'
              ],
            ),
        ) ?? 0;
  
      const mortality =
        mean(
          filteredHospitals,
          (hospital) =>
            percentBetter(
              hospital[
                'Count of MORT Measures Better'
              ],
              hospital[
                'Count of Facility MORT Measures'
              ],
            ),
        ) ?? 0;
  
      const safety =
        mean(
          filteredHospitals,
          (hospital) =>
            percentBetter(
              hospital[
                'Count of Safety Measures Better'
              ],
              hospital[
                'Count of Facility Safety Measures'
              ],
            ),
        ) ?? 0;
  
      const readmissions =
        mean(
          filteredHospitals,
          (hospital) =>
            percentBetter(
              hospital[
                'Count of READM Measures Better'
              ],
              hospital[
                'Count of Facility READM Measures'
              ],
            ),
        ) ?? 0;
  
      return {
        rating,
        mortality,
        safety,
        readmissions,
      };
    }, [filteredHospitals]);
  
    const width = 920;
    const rowHeight = 44;
  
    const margin = {
      top: 20,
      right: 80,
      bottom: 55,
      left: 285,
    };
  
    const innerWidth =
      width - margin.left - margin.right;
  
    const innerHeight = Math.max(
      pageHospitals.length * rowHeight,
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
        pageHospitals.map(
          (hospital) =>
            hospital['Facility ID'],
        ),
      )
      .range([0, innerHeight])
      .padding(0.25);
  
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
          padding: '40px 32px 60px',
          boxSizing: 'border-box',
          overflow: 'auto',
          background: '#f7f9fc',
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
              fontSize: '34px',
              fontWeight: 750,
              marginBottom: '8px',
            }}
          >
            U.S. Hospital Quality Explorer
          </h1>
  
          <p
            style={{
              fontSize: '18px',
              marginBottom: '6px',
            }}
          >
            Compare CMS hospital ratings and
            place individual hospitals in
            context.
          </p>
  
          <p
            style={{
              color: '#4b5563',
              maxWidth: '820px',
              lineHeight: 1.5,
              marginBottom: '24px',
            }}
          >
            Filter hospitals, browse the ranked
            results, and select a hospital to
            compare its performance with the
            current comparison group.
          </p>
  
          {/* Filters */}
          <div
            style={{
              background: 'white',
              padding: '20px',
              border:
                '1px solid #d9e0e8',
              borderRadius: '10px',
              marginBottom: '22px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
            }}
          >
            <label>
              <strong>State</strong>
  
              <div>
                <select
                  value={selectedState}
                  onChange={(event) => {
                    setSelectedState(
                      event.target.value,
                    );
  
                    setSelectedHospital(null);
                  }}
                  style={{
                    marginTop: '5px',
                    padding: '8px',
                    minWidth: '150px',
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
              </div>
            </label>
  
            <label>
              <strong>Hospital Type</strong>
  
              <div>
                <select
                  value={selectedType}
                  onChange={(event) => {
                    setSelectedType(
                      event.target.value,
                    );
  
                    setSelectedHospital(null);
                  }}
                  style={{
                    marginTop: '5px',
                    padding: '8px',
                    minWidth: '230px',
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
              </div>
            </label>
  
            <label>
              <strong>
                Search Hospital or City
              </strong>
  
              <div>
                <input
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Boston"
                  style={{
                    marginTop: '5px',
                    padding: '8px',
                    minWidth: '230px',
                  }}
                />
              </div>
            </label>
          </div>
  
          {/* Ranked chart */}
          <div
            style={{
              background: 'white',
              padding: '22px',
              border:
                '1px solid #d9e0e8',
              borderRadius: '10px',
            }}
          >
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '5px',
              }}
            >
              Hospital Overall Rating
            </h2>
  
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '15px',
              }}
            >
              Click a hospital to compare it
              with the current filtered group.
            </p>
  
            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <strong>
                {filteredHospitals.length}
              </strong>{' '}
              hospitals match the filters
            </div>
  
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
              >
                <g
                  transform={`translate(${margin.left}, ${margin.top})`}
                >
                  {[1, 2, 3, 4, 5].map(
                    (tick) => (
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
                    ),
                  )}
  
                  {pageHospitals.map(
                    (hospital) => {
                      const rating =
                        numberValue(
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
  
                      const selected =
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
                              yScale.bandwidth() /
                                2 +
                              4
                            }
                            textAnchor="end"
                            fontSize={12}
                            fontWeight={
                              selected
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
                              yScale.bandwidth()
                            }
                            fill={getRatingColor(
                              rating,
                            )}
                            opacity={
                              selected
                                ? 1
                                : 0.8
                            }
                            stroke={
                              selected
                                ? '#111827'
                                : 'none'
                            }
                            strokeWidth={
                              selected ? 3 : 0
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
                            onMouseEnter={() =>
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
                              })
                            }
                            onMouseLeave={() =>
                              setTooltip(null)
                            }
                          />
  
                          <text
                            x={
                              xScale(rating) +
                              8
                            }
                            y={
                              y +
                              yScale.bandwidth() /
                                2 +
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
                </g>
              </svg>
  
              {tooltip && (
                <div
                  style={{
                    position: 'absolute',
                    left: tooltip.x,
                    top:
                      tooltip.y - 70,
                    transform:
                      'translateX(-50%)',
                    background: '#111827',
                    color: 'white',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    pointerEvents: 'none',
                    fontSize: '13px',
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
  
                  Rating:{' '}
                  {
                    tooltip.hospital[
                      'Hospital overall rating'
                    ]
                  }
                  /5
                </div>
              )}
            </div>
  
            {/* Pagination */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '14px',
                marginTop: '10px',
              }}
            >
              <button
                disabled={page === 1}
                onClick={() =>
                  setPage((old) =>
                    Math.max(1, old - 1),
                  )
                }
                style={{
                  padding: '7px 12px',
                }}
              >
                Previous
              </button>
  
              <strong>
                Page {page} of {totalPages}
              </strong>
  
              <button
                disabled={
                  page === totalPages
                }
                onClick={() =>
                  setPage((old) =>
                    Math.min(
                      totalPages,
                      old + 1,
                    ),
                  )
                }
                style={{
                  padding: '7px 12px',
                }}
              >
                Next
              </button>
            </div>
          </div>
  
          {/* Selected hospital comparison */}
          {selectedHospital && (
            <div
              style={{
                marginTop: '24px',
                background: 'white',
                padding: '24px',
                border:
                  '1px solid #d9e0e8',
                borderRadius: '10px',
              }}
            >
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 750,
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
                  color: '#64748b',
                  marginBottom: '20px',
                }}
              >
                {
                  selectedHospital[
                    'City/Town'
                  ]
                }
                , {selectedHospital.State}
              </p>
  
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '12px',
                }}
              >
                Compared with Current Group
              </h3>
  
              <ComparisonRow
                label="Overall CMS Rating"
                hospitalValue={numberValue(
                  selectedHospital[
                    'Hospital overall rating'
                  ],
                )}
                averageValue={
                  comparisonStats.rating
                }
                max={5}
                suffix="/5"
              />
  
              <ComparisonRow
                label="Mortality Measures Better"
                hospitalValue={percentBetter(
                  selectedHospital[
                    'Count of MORT Measures Better'
                  ],
                  selectedHospital[
                    'Count of Facility MORT Measures'
                  ],
                )}
                averageValue={
                  comparisonStats.mortality
                }
                max={100}
                suffix="%"
              />
  
              <ComparisonRow
                label="Safety Measures Better"
                hospitalValue={percentBetter(
                  selectedHospital[
                    'Count of Safety Measures Better'
                  ],
                  selectedHospital[
                    'Count of Facility Safety Measures'
                  ],
                )}
                averageValue={
                  comparisonStats.safety
                }
                max={100}
                suffix="%"
              />
  
              <ComparisonRow
                label="Readmission Measures Better"
                hospitalValue={percentBetter(
                  selectedHospital[
                    'Count of READM Measures Better'
                  ],
                  selectedHospital[
                    'Count of Facility READM Measures'
                  ],
                )}
                averageValue={
                  comparisonStats.readmissions
                }
                max={100}
                suffix="%"
              />
  
              <p
                style={{
                  marginTop: '18px',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                Comparison group = all hospitals
                currently matching the selected
                filters.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  function ComparisonRow({
    label,
    hospitalValue,
    averageValue,
    max,
    suffix,
  }: {
    label: string;
    hospitalValue: number;
    averageValue: number;
    max: number;
    suffix: string;
  }) {
    const hospitalWidth =
      Math.min(
        100,
        (hospitalValue / max) * 100,
      );
  
    const averageWidth =
      Math.min(
        100,
        (averageValue / max) * 100,
      );
  
    return (
      <div
        style={{
          marginBottom: '20px',
        }}
      >
        <strong>{label}</strong>
  
        <div
          style={{
            marginTop: '7px',
            fontSize: '13px',
          }}
        >
          Selected hospital:{' '}
          <strong>
            {hospitalValue.toFixed(1)}
            {suffix}
          </strong>
        </div>
  
        <div
          style={{
            height: '10px',
            background: '#e5e7eb',
            borderRadius: '5px',
            marginTop: '4px',
          }}
        >
          <div
            style={{
              width: `${hospitalWidth}%`,
              height: '100%',
              background: '#247a5a',
              borderRadius: '5px',
            }}
          />
        </div>
  
        <div
          style={{
            marginTop: '7px',
            fontSize: '13px',
          }}
        >
          Current group average:{' '}
          <strong>
            {averageValue.toFixed(1)}
            {suffix}
          </strong>
        </div>
  
        <div
          style={{
            height: '10px',
            background: '#e5e7eb',
            borderRadius: '5px',
            marginTop: '4px',
          }}
        >
          <div
            style={{
              width: `${averageWidth}%`,
              height: '100%',
              background: '#94a3b8',
              borderRadius: '5px',
            }}
          />
        </div>
      </div>
    );
  }
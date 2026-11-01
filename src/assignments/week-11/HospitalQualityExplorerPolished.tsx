import {
    useEffect,
    useMemo,
    useState,
  } from 'react';
  
  import {
    csv,
    geoAlbersUsa,
    geoPath,
    mean,
    scaleBand,
    scaleLinear,
  } from 'd3';
  
  import {
    feature,
  } from 'topojson-client';
  
  import us from 'us-atlas/states-10m.json';
  import zipcodes from 'zipcodes-us';
  
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
  
  type MappedHospital = HospitalRow & {
    latitude: number;
    longitude: number;
  };
  
  type TooltipData = {
    x: number;
    y: number;
    hospital: HospitalRow;
  } | null;
  
  const STATE_FIPS: Record<string, string> = {
    AL: '01',
    AK: '02',
    AZ: '04',
    AR: '05',
    CA: '06',
    CO: '08',
    CT: '09',
    DE: '10',
    DC: '11',
    FL: '12',
    GA: '13',
    HI: '15',
    ID: '16',
    IL: '17',
    IN: '18',
    IA: '19',
    KS: '20',
    KY: '21',
    LA: '22',
    ME: '23',
    MD: '24',
    MA: '25',
    MI: '26',
    MN: '27',
    MS: '28',
    MO: '29',
    MT: '30',
    NE: '31',
    NV: '32',
    NH: '33',
    NJ: '34',
    NM: '35',
    NY: '36',
    NC: '37',
    ND: '38',
    OH: '39',
    OK: '40',
    OR: '41',
    PA: '42',
    RI: '44',
    SC: '45',
    SD: '46',
    TN: '47',
    TX: '48',
    UT: '49',
    VT: '50',
    VA: '51',
    WA: '53',
    WV: '54',
    WI: '55',
    WY: '56',
  };
  
  function getRatingColor(rating: number) {
    if (rating === 5) return '#247a5a';
    if (rating === 4) return '#55a36d';
    if (rating === 3) return '#d4a72c';
    if (rating === 2) return '#d97941';
  
    return '#b84a4a';
  }
  
  function numberValue(value: string) {
    const parsed = Number(value);
  
    return Number.isNaN(parsed)
      ? 0
      : parsed;
  }
  
  function percentBetter(
    better: string,
    total: string,
  ) {
    const betterValue =
      numberValue(better);
  
    const totalValue =
      numberValue(total);
  
    if (totalValue === 0) {
      return 0;
    }
  
    return (
      (betterValue / totalValue) *
      100
    );
  }
  
  function normalizeZip(value: string) {
    const digits =
      String(value).replace(
        /\D/g,
        '',
      );
  
    if (!digits) {
      return '';
    }
  
    return digits
      .padStart(5, '0')
      .slice(0, 5);
  }
  
  export function HospitalQualityExplorerPolished() {
    const [hospitals, setHospitals] =
      useState<HospitalRow[]>([]);
  
    const [loading, setLoading] =
      useState(true);
  
    const [
      selectedState,
      setSelectedState,
    ] = useState('MA');
  
    const [
      selectedType,
      setSelectedType,
    ] = useState('All Types');
  
    const [
      searchText,
      setSearchText,
    ] = useState('');
  
    const [
      hoveredHospitalId,
      setHoveredHospitalId,
    ] =
      useState<string | null>(null);
  
    const [
      selectedHospital,
      setSelectedHospital,
    ] =
      useState<HospitalRow | null>(
        null,
      );
  
    const [
      comparisonHospitals,
      setComparisonHospitals,
    ] = useState<HospitalRow[]>(
      [],
    );
  
    const [
      highlightedRatings,
      setHighlightedRatings,
    ] = useState<number[]>([]);
  
    const [
      mapTooltip,
      setMapTooltip,
    ] =
      useState<TooltipData>(null);
  
    const [
      chartTooltip,
      setChartTooltip,
    ] =
      useState<TooltipData>(null);
  
    const [page, setPage] =
      useState(1);
  
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
            .map(
              (hospital) =>
                hospital.State,
            )
            .filter(Boolean),
        ),
      ).sort();
    }, [hospitals]);
  
    const hospitalTypes =
      useMemo(() => {
        return Array.from(
          new Set(
            hospitals
              .map(
                (hospital) =>
                  hospital[
                    'Hospital Type'
                  ],
              )
              .filter(Boolean),
          ),
        ).sort();
      }, [hospitals]);
  
    const filteredHospitals =
      useMemo(() => {
        return hospitals
          .filter((hospital) => {
            const rating =
              numberValue(
                hospital[
                  'Hospital overall rating'
                ],
              );
  
            const validRating =
              rating >= 1 &&
              rating <= 5;
  
            const matchesState =
              selectedState ===
                'All States' ||
              hospital.State ===
                selectedState;
  
            const matchesType =
              selectedType ===
                'All Types' ||
              hospital[
                'Hospital Type'
              ] === selectedType;
  
            const search =
              searchText
                .trim()
                .toLowerCase();
  
            const matchesSearch =
              search === '' ||
              hospital[
                'Facility Name'
              ]
                .toLowerCase()
                .includes(search) ||
              hospital[
                'City/Town'
              ]
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
            const ratingDiff =
              numberValue(
                b[
                  'Hospital overall rating'
                ],
              ) -
              numberValue(
                a[
                  'Hospital overall rating'
                ],
              );
  
            if (ratingDiff !== 0) {
              return ratingDiff;
            }
  
            return a[
              'Facility Name'
            ].localeCompare(
              b[
                'Facility Name'
              ],
            );
          });
      }, [
        hospitals,
        selectedState,
        selectedType,
        searchText,
      ]);
  
    useEffect(() => {
      setPage(1);
      setSelectedHospital(null);
      setHoveredHospitalId(null);
    }, [
      selectedState,
      selectedType,
      searchText,
    ]);
  
    const totalPages =
      Math.max(
        1,
        Math.ceil(
          filteredHospitals.length /
            pageSize,
        ),
      );
  
    const pageHospitals =
      filteredHospitals.slice(
        (page - 1) *
          pageSize,
        page * pageSize,
      );
  
    const mappedHospitals =
      useMemo(() => {
        const result: MappedHospital[] =
          [];
  
        filteredHospitals.forEach(
          (hospital) => {
            const zip =
              normalizeZip(
                hospital[
                  'ZIP Code'
                ],
              );
  
            if (!zip) {
              return;
            }
  
            const location =
              zipcodes.findCoordinates(
                zip,
              );
  
            if (
              !location ||
              !location.isValid
            ) {
              return;
            }
  
            if (
              !Number.isFinite(
                location.latitude,
              ) ||
              !Number.isFinite(
                location.longitude,
              )
            ) {
              return;
            }
  
            result.push({
              ...hospital,
              latitude:
                location.latitude,
              longitude:
                location.longitude,
            });
          },
        );
  
        return result;
      }, [filteredHospitals]);
  
    const comparisonStats =
      useMemo(() => {
        return {
          rating:
            mean(
              filteredHospitals,
              (hospital) =>
                numberValue(
                  hospital[
                    'Hospital overall rating'
                  ],
                ),
            ) ?? 0,
  
          mortality:
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
            ) ?? 0,
  
          safety:
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
            ) ?? 0,
  
          readmissions:
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
            ) ?? 0,
        };
      }, [filteredHospitals]);
  
    function toggleRating(
      rating: number,
    ) {
      setHighlightedRatings(
        (current) => {
          if (
            current.includes(
              rating,
            )
          ) {
            return current.filter(
              (value) =>
                value !==
                rating,
            );
          }
  
          return [
            ...current,
            rating,
          ];
        },
      );
    }
  
    function ratingMatches(
      hospital: HospitalRow,
    ) {
      if (
        highlightedRatings.length ===
        0
      ) {
        return true;
      }
  
      return highlightedRatings.includes(
        numberValue(
          hospital[
            'Hospital overall rating'
          ],
        ),
      );
    }
  
    function toggleComparison(
      hospital: HospitalRow,
    ) {
      setComparisonHospitals(
        (current) => {
          const alreadySelected =
            current.some(
              (item) =>
                item[
                  'Facility ID'
                ] ===
                hospital[
                  'Facility ID'
                ],
            );
  
          if (alreadySelected) {
            return current.filter(
              (item) =>
                item[
                  'Facility ID'
                ] !==
                hospital[
                  'Facility ID'
                ],
            );
          }
  
          if (
            current.length >= 2
          ) {
            return [
              current[1],
              hospital,
            ];
          }
  
          return [
            ...current,
            hospital,
          ];
        },
      );
    }
  
    function isComparisonHospital(
      hospital: HospitalRow,
    ) {
      return comparisonHospitals.some(
        (item) =>
          item[
            'Facility ID'
          ] ===
          hospital[
            'Facility ID'
          ],
      );
    }
  
    const mapWidth = 900;
    const mapHeight = 520;
  
    const stateFeatures =
      useMemo(() => {
        const topology =
          us as unknown as {
            objects: {
              states: unknown;
            };
          };
  
        const collection =
          feature(
            us as never,
            topology.objects
              .states as never,
          ) as unknown as {
            features: Array<{
              id?: string | number;
              type: string;
              geometry: unknown;
              properties?: Record<
                string,
                unknown
              >;
            }>;
          };
  
        return collection.features;
      }, []);
  
    const visibleStateFeatures =
      useMemo(() => {
        if (
          selectedState ===
          'All States'
        ) {
          return stateFeatures;
        }
  
        const fips =
          STATE_FIPS[
            selectedState
          ];
  
        if (!fips) {
          return stateFeatures;
        }
  
        return stateFeatures.filter(
          (state) =>
            String(state.id)
              .padStart(2, '0') ===
            fips,
        );
      }, [
        selectedState,
        stateFeatures,
      ]);
  
    const projection =
      useMemo(() => {
        const nextProjection =
          geoAlbersUsa();
  
        const geometry = {
          type:
            'FeatureCollection',
          features:
            visibleStateFeatures,
        } as never;
  
        nextProjection.fitExtent(
          [
            [30, 25],
            [
              mapWidth - 30,
              mapHeight - 25,
            ],
          ],
          geometry,
        );
  
        return nextProjection;
      }, [visibleStateFeatures]);
  
    const mapPath =
      useMemo(
        () =>
          geoPath(
            projection,
          ),
        [projection],
      );
  
    const width = 920;
    const rowHeight = 48;
  
    const margin = {
      top: 20,
      right: 120,
      bottom: 55,
      left: 285,
    };
  
    const innerWidth =
      width -
      margin.left -
      margin.right;
  
    const innerHeight =
      Math.max(
        pageHospitals.length *
          rowHeight,
        100,
      );
  
    const height =
      innerHeight +
      margin.top +
      margin.bottom;
  
    const xScale =
      scaleLinear()
        .domain([0, 5])
        .range([
          0,
          innerWidth,
        ]);
  
    const yScale =
      scaleBand()
        .domain(
          pageHospitals.map(
            (hospital) =>
              hospital[
                'Facility ID'
              ],
          ),
        )
        .range([
          0,
          innerHeight,
        ])
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
          height: '100%',
          minHeight: 0,
          alignSelf: 'stretch',
          background: '#f7f9fc',
          padding: '40px 32px 60px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            maxWidth:
              '1180px',
            margin: '0 auto',
          }}
        >
          <header
            style={{
              marginBottom:
                '28px',
            }}
          >
            <h1
              style={{
                fontSize:
                  '36px',
                fontWeight:
                  800,
                marginBottom:
                  '6px',
              }}
            >
              Hospital Quality
              Explorer
            </h1>
  
            <p
              style={{
                fontSize:
                  '18px',
                color:
                  '#334155',
                marginBottom:
                  '6px',
              }}
            >
              Explore, filter, and
              compare U.S. hospitals
              using public CMS
              quality data.
            </p>
  
            <p
              style={{
                fontSize:
                  '14px',
                color:
                  '#64748b',
                maxWidth:
                  '850px',
                lineHeight:
                  1.5,
              }}
            >
              CMS overall ratings
              range from 1 to 5
              stars, with higher
              ratings indicating
              stronger overall
              performance across
              measured quality
              categories.
            </p>
          </header>
  
          {/* FILTERS */}
          <section
            style={{
              background:
                'white',
              padding: '20px',
              border:
                '1px solid #d9e0e8',
              borderRadius:
                '10px',
              marginBottom:
                '22px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
            }}
          >
            <label>
              <strong>
                State
              </strong>
  
              <div>
                <select
                  value={
                    selectedState
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedState(
                      event.target
                        .value,
                    )
                  }
                  style={{
                    marginTop:
                      '5px',
                    padding: '8px',
                    minWidth:
                      '150px',
                  }}
                >
                  <option value="All States">
                    All States
                  </option>
  
                  {states.map(
                    (state) => (
                      <option
                        key={
                          state
                        }
                        value={
                          state
                        }
                      >
                        {state}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>
  
            <label>
              <strong>
                Hospital Type
              </strong>
  
              <div>
                <select
                  value={
                    selectedType
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedType(
                      event.target
                        .value,
                    )
                  }
                  style={{
                    marginTop:
                      '5px',
                    padding: '8px',
                    minWidth:
                      '230px',
                  }}
                >
                  <option value="All Types">
                    All Types
                  </option>
  
                  {hospitalTypes.map(
                    (type) => (
                      <option
                        key={
                          type
                        }
                        value={
                          type
                        }
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
                Search
              </strong>
  
              <div>
                <input
                  value={
                    searchText
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearchText(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Hospital or city"
                  style={{
                    marginTop:
                      '5px',
                    padding: '8px',
                    minWidth:
                      '240px',
                  }}
                />
              </div>
            </label>
  
            <div
              style={{
                marginLeft:
                  'auto',
                alignSelf:
                  'center',
                background:
                  '#eef2f7',
                padding:
                  '9px 13px',
                borderRadius:
                  '7px',
                fontSize:
                  '14px',
              }}
            >
              <strong>
                {
                  filteredHospitals.length
                }
              </strong>{' '}
              hospitals
            </div>
          </section>
  
          {/* LEGEND */}
          <section
            style={{
              background:
                'white',
              padding: '20px',
              border:
                '1px solid #d9e0e8',
              borderRadius:
                '10px',
              marginBottom:
                '22px',
            }}
          >
            <h2
              style={{
                fontSize:
                  '20px',
                marginBottom:
                  '6px',
              }}
            >
              Filter by CMS Rating
            </h2>
  
            <p
              style={{
                color:
                  '#64748b',
                fontSize:
                  '14px',
                marginBottom:
                  '14px',
              }}
            >
              Select one or more
              ratings to emphasize
              matching hospitals
              across the map and
              ranking.
            </p>
  
            <div
              style={{
                display:
                  'flex',
                flexWrap:
                  'wrap',
                gap:
                  '10px',
              }}
            >
              {[5, 4, 3, 2, 1].map(
                (rating) => {
                  const selected =
                    highlightedRatings.includes(
                      rating,
                    );
  
                  const faded =
                    highlightedRatings.length >
                      0 &&
                    !selected;
  
                  return (
                    <button
                      key={
                        rating
                      }
                      onClick={() =>
                        toggleRating(
                          rating,
                        )
                      }
                      style={{
                        display:
                          'flex',
                        gap:
                          '7px',
                        alignItems:
                          'center',
                        padding:
                          '8px 12px',
                        background:
                          selected
                            ? '#eef2f7'
                            : 'white',
                        border:
                          selected
                            ? '2px solid #334155'
                            : '1px solid #cbd5e1',
                        borderRadius:
                          '6px',
                        cursor:
                          'pointer',
                        opacity:
                          faded
                            ? 0.4
                            : 1,
                      }}
                    >
                      <span
                        style={{
                          width:
                            '14px',
                          height:
                            '14px',
                          borderRadius:
                            '3px',
                          background:
                            getRatingColor(
                              rating,
                            ),
                        }}
                      />
  
                      {rating} Star
                    </button>
                  );
                },
              )}
  
              {highlightedRatings.length >
                0 && (
                <button
                  onClick={() =>
                    setHighlightedRatings(
                      [],
                    )
                  }
                  style={{
                    padding:
                      '8px 12px',
                    border:
                      '1px solid #94a3b8',
                    background:
                      'white',
                    borderRadius:
                      '6px',
                    cursor:
                      'pointer',
                  }}
                >
                  Show All
                </button>
              )}
            </div>
          </section>
  
          {/* COMPARISON SELECTION */}
          <section
            style={{
              background:
                'white',
              padding: '18px 20px',
              border:
                '1px solid #d9e0e8',
              borderRadius:
                '10px',
              marginBottom:
                '22px',
            }}
          >
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                flexWrap:
                  'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize:
                      '20px',
                    marginBottom:
                      '4px',
                  }}
                >
                  Compare Hospitals
                </h2>
  
                <p
                  style={{
                    color:
                      '#64748b',
                    fontSize:
                      '14px',
                    margin: 0,
                  }}
                >
                  Select up to two
                  hospitals from the
                  map or ranking.
                </p>
              </div>
  
              {comparisonHospitals.length >
                0 && (
                <button
                  onClick={() =>
                    setComparisonHospitals(
                      [],
                    )
                  }
                  style={{
                    padding:
                      '8px 12px',
                    border:
                      '1px solid #94a3b8',
                    background:
                      'white',
                    borderRadius:
                      '6px',
                    cursor:
                      'pointer',
                  }}
                >
                  Clear Comparison
                </button>
              )}
            </div>
  
            <div
              style={{
                display:
                  'flex',
                flexWrap:
                  'wrap',
                gap:
                  '10px',
                marginTop:
                  '14px',
              }}
            >
              {comparisonHospitals.length ===
                0 && (
                <span
                  style={{
                    color:
                      '#94a3b8',
                    fontSize:
                      '14px',
                  }}
                >
                  No hospitals selected yet.
                </span>
              )}
  
              {comparisonHospitals.map(
                (hospital) => (
                  <div
                    key={
                      hospital[
                        'Facility ID'
                      ]
                    }
                    style={{
                      background:
                        '#eef2f7',
                      padding:
                        '8px 10px',
                      borderRadius:
                        '6px',
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap:
                        '8px',
                    }}
                  >
                    <strong>
                      {
                        hospital[
                          'Facility Name'
                        ]
                      }
                    </strong>
  
                    <button
                      onClick={() =>
                        toggleComparison(
                          hospital,
                        )
                      }
                      style={{
                        border:
                          'none',
                        background:
                          'transparent',
                        cursor:
                          'pointer',
                        fontWeight:
                          'bold',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
            </div>
          </section>
  
          {/* MAP */}
          <section
            style={{
              background:
                'white',
              padding: '22px',
              border:
                '1px solid #d9e0e8',
              borderRadius:
                '10px',
              marginBottom:
                '22px',
            }}
          >
            <h2
              style={{
                fontSize:
                  '22px',
                marginBottom:
                  '5px',
              }}
            >
              Hospital Map
            </h2>
  
            <p
              style={{
                color:
                  '#64748b',
                fontSize:
                  '14px',
                marginBottom:
                  '5px',
              }}
            >
              Hover to inspect a
              hospital. Click a
              hospital to open its
              details. Use the
              Compare button below
              or select it from the
              ranking.
            </p>
  
            <p
              style={{
                color:
                  '#94a3b8',
                fontSize:
                  '12px',
                marginBottom:
                  '14px',
              }}
            >
              Hospital locations are
              approximate ZIP-code
              centroids.
            </p>
  
            <div
              style={{
                position:
                  'relative',
              }}
            >
              <svg
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                style={{
                  width:
                    '100%',
                  maxWidth:
                    `${mapWidth}px`,
                  height:
                    'auto',
                  display:
                    'block',
                }}
              >
                {visibleStateFeatures.map(
                  (
                    state,
                    index,
                  ) => {
                    const path =
                      mapPath(
                        state as never,
                      );
  
                    if (!path) {
                      return null;
                    }
  
                    return (
                      <path
                        key={
                          String(
                            state.id ??
                              index,
                          )
                        }
                        d={path}
                        fill="#edf1f5"
                        stroke="#94a3b8"
                        strokeWidth={
                          1
                        }
                      />
                    );
                  },
                )}
  
                {mappedHospitals.map(
                  (hospital) => {
                    const point =
                      projection([
                        hospital.longitude,
                        hospital.latitude,
                      ]);
  
                    if (!point) {
                      return null;
                    }
  
                    const [x, y] =
                      point;
  
                    const hovered =
                      hoveredHospitalId ===
                      hospital[
                        'Facility ID'
                      ];
  
                    const selected =
                      selectedHospital?.[
                        'Facility ID'
                      ] ===
                      hospital[
                        'Facility ID'
                      ];
  
                    const comparing =
                      isComparisonHospital(
                        hospital,
                      );
  
                    const matches =
                      ratingMatches(
                        hospital,
                      );
  
                    const rating =
                      numberValue(
                        hospital[
                          'Hospital overall rating'
                        ],
                      );
  
                    return (
                      <circle
                        key={
                          hospital[
                            'Facility ID'
                          ]
                        }
                        cx={x}
                        cy={y}
                        r={
                          comparing
                            ? 9
                            : selected
                              ? 8
                              : hovered
                                ? 7
                                : 5
                        }
                        fill={getRatingColor(
                          rating,
                        )}
                        stroke={
                          comparing
                            ? '#000'
                            : selected ||
                                hovered
                              ? '#111827'
                              : 'white'
                        }
                        strokeWidth={
                          comparing
                            ? 3
                            : selected ||
                                hovered
                              ? 2.5
                              : 1
                        }
                        opacity={
                          matches
                            ? 0.9
                            : 0.08
                        }
                        style={{
                          cursor:
                            'pointer',
                        }}
                        onMouseEnter={(
                          event,
                        ) => {
                          setHoveredHospitalId(
                            hospital[
                              'Facility ID'
                            ],
                          );
  
                          const bounds =
                            event.currentTarget.ownerSVGElement?.getBoundingClientRect();
  
                          if (
                            bounds
                          ) {
                            setMapTooltip(
                              {
                                x:
                                  x *
                                  (bounds.width /
                                    mapWidth),
                                y:
                                  y *
                                  (bounds.height /
                                    mapHeight),
                                hospital,
                              },
                            );
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredHospitalId(
                            null,
                          );
  
                          setMapTooltip(
                            null,
                          );
                        }}
                        onClick={() =>
                          setSelectedHospital(
                            hospital,
                          )
                        }
                      />
                    );
                  },
                )}
              </svg>
  
              {mapTooltip && (
                <div
                  style={{
                    position:
                      'absolute',
                    left:
                      mapTooltip.x,
                    top:
                      mapTooltip.y -
                      105,
                    transform:
                      'translateX(-50%)',
                    background:
                      '#111827',
                    color:
                      'white',
                    padding:
                      '10px 12px',
                    borderRadius:
                      '7px',
                    pointerEvents:
                      'none',
                    fontSize:
                      '13px',
                    zIndex:
                      10,
                    minWidth:
                      '190px',
                  }}
                >
                  <strong>
                    {
                      mapTooltip
                        .hospital[
                        'Facility Name'
                      ]
                    }
                  </strong>
  
                  <br />
  
                  {
                    mapTooltip
                      .hospital[
                      'City/Town'
                    ]
                  }
                  ,{' '}
                  {
                    mapTooltip
                      .hospital
                      .State
                  }
  
                  <br />
  
                  {
                    mapTooltip
                      .hospital[
                      'Hospital Type'
                    ]
                  }
  
                  <br />
  
                  CMS Rating:{' '}
                  {
                    mapTooltip
                      .hospital[
                      'Hospital overall rating'
                    ]
                  }
                  /5
                </div>
              )}
            </div>
          </section>
  
          {/* RANKING */}
          <section
            style={{
              background:
                'white',
              padding: '22px',
              border:
                '1px solid #d9e0e8',
              borderRadius:
                '10px',
              marginBottom:
                '22px',
            }}
          >
            <h2
              style={{
                fontSize:
                  '22px',
                marginBottom:
                  '5px',
              }}
            >
              Hospital Ranking
            </h2>
  
            <p
              style={{
                color:
                  '#64748b',
                fontSize:
                  '14px',
                marginBottom:
                  '14px',
              }}
            >
              Hover for linked
              highlighting, click
              the bar for hospital
              details, or use
              Compare to add a
              hospital to the
              side-by-side view.
            </p>
  
            <div
              style={{
                position:
                  'relative',
                width:
                  `${width}px`,
                maxWidth:
                  '100%',
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
                        key={
                          tick
                        }
                        transform={`translate(${xScale(
                          tick,
                        )}, 0)`}
                      >
                        <line
                          y1={0}
                          y2={
                            innerHeight
                          }
                          stroke="#e5e7eb"
                        />
  
                        <text
                          y={
                            innerHeight +
                            28
                          }
                          textAnchor="middle"
                          fontSize={
                            12
                          }
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
  
                      const hovered =
                        hoveredHospitalId ===
                        hospital[
                          'Facility ID'
                        ];
  
                      const comparing =
                        isComparisonHospital(
                          hospital,
                        );
  
                      const matches =
                        ratingMatches(
                          hospital,
                        );
  
                      return (
                        <g
                          key={
                            hospital[
                              'Facility ID'
                            ]
                          }
                          onMouseEnter={() =>
                            setHoveredHospitalId(
                              hospital[
                                'Facility ID'
                              ],
                            )
                          }
                          onMouseLeave={() => {
                            setHoveredHospitalId(
                              null,
                            );
  
                            setChartTooltip(
                              null,
                            );
                          }}
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
                            fontSize={
                              12
                            }
                            fontWeight={
                              selected ||
                              hovered ||
                              comparing
                                ? 'bold'
                                : 'normal'
                            }
                            opacity={
                              matches
                                ? 1
                                : 0.25
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
                              matches
                                ? 0.85
                                : 0.1
                            }
                            stroke={
                              comparing
                                ? '#000'
                                : selected ||
                                    hovered
                                  ? '#111827'
                                  : 'none'
                            }
                            strokeWidth={
                              comparing
                                ? 3
                                : selected
                                  ? 3
                                  : hovered
                                    ? 2
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
                            onMouseEnter={() =>
                              setChartTooltip(
                                {
                                  x:
                                    margin.left +
                                    xScale(
                                      rating,
                                    ),
                                  y:
                                    margin.top +
                                    y,
                                  hospital,
                                },
                              )
                            }
                          />
  
                          <text
                            x={
                              xScale(
                                rating,
                              ) +
                              8
                            }
                            y={
                              y +
                              yScale.bandwidth() /
                                2 +
                              4
                            }
                            fontSize={
                              12
                            }
                            fontWeight="bold"
                            opacity={
                              matches
                                ? 1
                                : 0.25
                            }
                          >
                            {rating}/5
                          </text>
  
                          <foreignObject
                            x={
                              innerWidth +
                              50
                            }
                            y={y}
                            width={80}
                            height={
                              yScale.bandwidth()
                            }
                          >
                            <button
                              onClick={() =>
                                toggleComparison(
                                  hospital,
                                )
                              }
                              style={{
                                width:
                                  '72px',
                                height:
                                  '28px',
                                fontSize:
                                  '11px',
                                cursor:
                                  'pointer',
                                borderRadius:
                                  '5px',
                                border:
                                  comparing
                                    ? '2px solid #111827'
                                    : '1px solid #cbd5e1',
                                background:
                                  comparing
                                    ? '#eef2f7'
                                    : 'white',
                              }}
                            >
                              {comparing
                                ? 'Added'
                                : 'Compare'}
                            </button>
                          </foreignObject>
                        </g>
                      );
                    },
                  )}
                </g>
              </svg>
  
              {chartTooltip && (
                <div
                  style={{
                    position:
                      'absolute',
                    left:
                      chartTooltip.x,
                    top:
                      chartTooltip.y -
                      70,
                    transform:
                      'translateX(-50%)',
                    background:
                      '#111827',
                    color:
                      'white',
                    padding:
                      '8px 10px',
                    borderRadius:
                      '6px',
                    pointerEvents:
                      'none',
                    fontSize:
                      '13px',
                    zIndex:
                      10,
                  }}
                >
                  <strong>
                    {
                      chartTooltip
                        .hospital[
                        'Facility Name'
                      ]
                    }
                  </strong>
  
                  <br />
  
                  {
                    chartTooltip
                      .hospital[
                      'City/Town'
                    ]
                  }
                  ,{' '}
                  {
                    chartTooltip
                      .hospital
                      .State
                  }
  
                  <br />
  
                  Rating:{' '}
                  {
                    chartTooltip
                      .hospital[
                      'Hospital overall rating'
                    ]
                  }
                  /5
                </div>
              )}
            </div>
  
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'center',
                alignItems:
                  'center',
                gap:
                  '14px',
                marginTop:
                  '12px',
              }}
            >
              <button
                disabled={
                  page === 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current -
                          1,
                      ),
                  )
                }
              >
                Previous
              </button>
  
              <strong>
                Page {page} of{' '}
                {totalPages}
              </strong>
  
              <button
                disabled={
                  page ===
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages,
                        current +
                          1,
                      ),
                  )
                }
              >
                Next
              </button>
            </div>
          </section>
  
          {/* TWO HOSPITAL COMPARISON */}
          {comparisonHospitals.length ===
            2 && (
            <section
              style={{
                background:
                  'white',
                padding:
                  '24px',
                border:
                  '1px solid #d9e0e8',
                borderRadius:
                  '10px',
                marginBottom:
                  '22px',
              }}
            >
              <h2
                style={{
                  fontSize:
                    '24px',
                  marginBottom:
                    '18px',
                }}
              >
                Side-by-Side Hospital
                Comparison
              </h2>
  
              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    '180px 1fr 1fr',
                  gap:
                    '12px',
                }}
              >
                <div />
  
                {comparisonHospitals.map(
                  (hospital) => (
                    <div
                      key={
                        hospital[
                          'Facility ID'
                        ]
                      }
                      style={{
                        fontWeight:
                          700,
                        fontSize:
                          '16px',
                      }}
                    >
                      {
                        hospital[
                          'Facility Name'
                        ]
                      }
  
                      <div
                        style={{
                          fontSize:
                            '12px',
                          color:
                            '#64748b',
                          fontWeight:
                            400,
                          marginTop:
                            '3px',
                        }}
                      >
                        {
                          hospital[
                            'City/Town'
                          ]
                        }
                        ,{' '}
                        {
                          hospital.State
                        }
                      </div>
                    </div>
                  ),
                )}
  
                <ComparisonMetric
                  label="CMS Rating"
                  values={comparisonHospitals.map(
                    (hospital) =>
                      numberValue(
                        hospital[
                          'Hospital overall rating'
                        ],
                      ),
                  )}
                  suffix="/5"
                  max={5}
                />
  
                <ComparisonMetric
                  label="Mortality Better"
                  values={comparisonHospitals.map(
                    (hospital) =>
                      percentBetter(
                        hospital[
                          'Count of MORT Measures Better'
                        ],
                        hospital[
                          'Count of Facility MORT Measures'
                        ],
                      ),
                  )}
                  suffix="%"
                  max={100}
                />
  
                <ComparisonMetric
                  label="Safety Better"
                  values={comparisonHospitals.map(
                    (hospital) =>
                      percentBetter(
                        hospital[
                          'Count of Safety Measures Better'
                        ],
                        hospital[
                          'Count of Facility Safety Measures'
                        ],
                      ),
                  )}
                  suffix="%"
                  max={100}
                />
  
                <ComparisonMetric
                  label="Readmission Better"
                  values={comparisonHospitals.map(
                    (hospital) =>
                      percentBetter(
                        hospital[
                          'Count of READM Measures Better'
                        ],
                        hospital[
                          'Count of Facility READM Measures'
                        ],
                      ),
                  )}
                  suffix="%"
                  max={100}
                />
              </div>
            </section>
          )}
  
          {/* SINGLE SELECTED HOSPITAL */}
          {selectedHospital && (
            <section
              style={{
                background:
                  'white',
                padding:
                  '24px',
                border:
                  '1px solid #d9e0e8',
                borderRadius:
                  '10px',
              }}
            >
              <h2
                style={{
                  fontSize:
                    '24px',
                  marginBottom:
                    '4px',
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
                  color:
                    '#64748b',
                  marginBottom:
                    '20px',
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
  
              <h3>
                Compared with Current
                Filtered Group
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
            </section>
          )}
        </div>
      </div>
    );
  }
  
  function ComparisonMetric({
    label,
    values,
    suffix,
    max,
  }: {
    label: string;
    values: number[];
    suffix: string;
    max: number;
  }) {
    return (
      <>
        <div
          style={{
            fontWeight:
              700,
            alignSelf:
              'center',
          }}
        >
          {label}
        </div>
  
        {values.map(
          (
            value,
            index,
          ) => (
            <div
              key={
                index
              }
            >
              <strong>
                {value.toFixed(
                  1,
                )}
                {suffix}
              </strong>
  
              <div
                style={{
                  height:
                    '10px',
                  background:
                    '#e5e7eb',
                  borderRadius:
                    '5px',
                  marginTop:
                    '5px',
                }}
              >
                <div
                  style={{
                    width:
                      `${Math.min(
                        100,
                        (value /
                          max) *
                          100,
                      )}%`,
                    height:
                      '100%',
                    borderRadius:
                      '5px',
                    background:
                      '#247a5a',
                  }}
                />
              </div>
            </div>
          ),
        )}
      </>
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
        (hospitalValue /
          max) *
          100,
      );
  
    const averageWidth =
      Math.min(
        100,
        (averageValue /
          max) *
          100,
      );
  
    return (
      <div
        style={{
          marginBottom:
            '20px',
        }}
      >
        <strong>
          {label}
        </strong>
  
        <div
          style={{
            marginTop:
              '7px',
            fontSize:
              '13px',
          }}
        >
          Selected hospital:{' '}
          <strong>
            {hospitalValue.toFixed(
              1,
            )}
            {suffix}
          </strong>
        </div>
  
        <div
          style={{
            height:
              '10px',
            background:
              '#e5e7eb',
            borderRadius:
              '5px',
            marginTop:
              '4px',
          }}
        >
          <div
            style={{
              width:
                `${hospitalWidth}%`,
              height:
                '100%',
              background:
                '#247a5a',
              borderRadius:
                '5px',
            }}
          />
        </div>
  
        <div
          style={{
            marginTop:
              '7px',
            fontSize:
              '13px',
          }}
        >
          Current group average:{' '}
          <strong>
            {averageValue.toFixed(
              1,
            )}
            {suffix}
          </strong>
        </div>
  
        <div
          style={{
            height:
              '10px',
            background:
              '#e5e7eb',
            borderRadius:
              '5px',
            marginTop:
              '4px',
          }}
        >
          <div
            style={{
              width:
                `${averageWidth}%`,
              height:
                '100%',
              background:
                '#94a3b8',
              borderRadius:
                '5px',
            }}
          />
        </div>
      </div>
    );
  }
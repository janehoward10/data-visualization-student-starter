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
  const digits = String(value)
    .replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  }

  return digits
    .padStart(5, '0')
    .slice(0, 5);
}

export function HospitalQualityInteractiveLegend() {
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
    selectedHospital,
    setSelectedHospital,
  ] =
    useState<HospitalRow | null>(
      null,
    );

  const [
    hoveredHospitalId,
    setHoveredHospitalId,
  ] =
    useState<string | null>(null);

  const [tooltip, setTooltip] =
    useState<TooltipData>(null);

  const [
    mapTooltip,
    setMapTooltip,
  ] =
    useState<TooltipData>(null);

  const [page, setPage] =
    useState(1);

  const [
    highlightedRatings,
    setHighlightedRatings,
  ] = useState<number[]>([]);

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
          const rating = Number(
            hospital[
              'Hospital overall rating'
            ],
          );

          const validRating =
            !Number.isNaN(
              rating,
            ) &&
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
          const difference =
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

          if (
            difference !== 0
          ) {
            return difference;
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

  /*
   * Convert hospital ZIP codes to
   * approximate ZIP-code centroid
   * coordinates.
   */
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

    const rating =
      numberValue(
        hospital[
          'Hospital overall rating'
        ],
      );

    return highlightedRatings.includes(
      rating,
    );
  }

  /*
   * MAP SETUP
   */
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

      const desiredFips =
        STATE_FIPS[
          selectedState
        ];

      if (!desiredFips) {
        return stateFeatures;
      }

      return stateFeatures.filter(
        (state) =>
          String(state.id)
            .padStart(2, '0') ===
          desiredFips,
      );
    }, [
      stateFeatures,
      selectedState,
    ]);

  const projection =
    useMemo(() => {
      const nextProjection =
        geoAlbersUsa();

      const geometry =
        {
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

  /*
   * BAR CHART SETUP
   */
  const width = 920;
  const rowHeight = 44;

  const margin = {
    top: 20,
    right: 80,
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
      <div
        style={{
          padding: '40px',
        }}
      >
        Loading hospital
        data...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        alignSelf:
          'stretch',
        minHeight:
          '100vh',
        padding:
          '40px 32px 60px',
        boxSizing:
          'border-box',
        overflow: 'auto',
        background:
          '#f7f9fc',
      }}
    >
      <div
        style={{
          maxWidth:
            '1120px',
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
          U.S. Hospital
          Quality Explorer
        </h1>

        <p
          style={{
            fontSize: '18px',
            marginBottom: '6px',
          }}
        >
          Explore hospital
          quality by rating,
          location, and
          performance.
        </p>

        <p
          style={{
            color: '#4b5563',
            maxWidth: '850px',
            lineHeight: 1.5,
            marginBottom:
              '24px',
          }}
        >
          Filter hospitals,
          highlight CMS rating
          categories, explore
          hospitals
          geographically, and
          select a hospital for
          more detailed
          comparison.
        </p>

        {/* FILTERS */}
        <div
          style={{
            background: 'white',
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
              Search Hospital
              or City
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
                placeholder="e.g. Boston"
                style={{
                  marginTop:
                    '5px',
                  padding: '8px',
                  minWidth:
                    '230px',
                }}
              />
            </div>
          </label>
        </div>

        {/* INTERACTIVE LEGEND */}
        <div
          style={{
            background: 'white',
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
              fontSize: '20px',
              marginBottom:
                '6px',
            }}
          >
            Interactive CMS
            Rating Legend
          </h2>

          <p
            style={{
              color: '#64748b',
              fontSize: '14px',
              marginBottom:
                '14px',
            }}
          >
            Click one or more
            ratings to highlight
            those hospitals across
            both the map and the
            ranking.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
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
                      alignItems:
                        'center',
                      gap: '7px',
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
                  background:
                    'white',
                  border:
                    '1px solid #94a3b8',
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
        </div>

        {/* HOSPITAL MAP */}
        <div
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
              fontSize: '22px',
              fontWeight: 700,
              marginBottom:
                '5px',
            }}
          >
            Hospital Map
          </h2>

          <p
            style={{
              color: '#64748b',
              fontSize: '14px',
              marginBottom:
                '4px',
            }}
          >
            Hover over a hospital
            to inspect it. Click a
            hospital to select it.
            Hovering here also
            highlights the same
            hospital in the ranked
            view below.
          </p>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginBottom:
                '14px',
            }}
          >
            Map locations are
            approximate and use
            ZIP-code centroids
            rather than exact
            building coordinates.
          </p>

          <div
            style={{
              marginBottom:
                '10px',
            }}
          >
            <strong>
              {
                mappedHospitals.length
              }
            </strong>{' '}
            hospitals mapped
          </div>

          <div
            style={{
              position:
                'relative',
              width: '100%',
              overflowX:
                'auto',
            }}
          >
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              style={{
                width: '100%',
                maxWidth:
                  `${mapWidth}px`,
                height: 'auto',
                display:
                  'block',
              }}
            >
              {/* State boundaries */}
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
                        selectedState ===
                        'All States'
                          ? 0.7
                          : 1.5
                      }
                    />
                  );
                },
              )}

              {/* Hospitals */}
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

                  const [
                    x,
                    y,
                  ] = point;

                  const rating =
                    numberValue(
                      hospital[
                        'Hospital overall rating'
                      ],
                    );

                  const legendMatch =
                    ratingMatches(
                      hospital,
                    );

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
                        selected
                          ? 8
                          : hovered
                            ? 7
                            : 5
                      }
                      fill={getRatingColor(
                        rating,
                      )}
                      stroke={
                        selected ||
                        hovered
                          ? '#111827'
                          : 'white'
                      }
                      strokeWidth={
                        selected ||
                        hovered
                          ? 2.5
                          : 1
                      }
                      opacity={
                        legendMatch
                          ? 0.88
                          : 0.08
                      }
                      style={{
                        cursor:
                          'pointer',
                        transition:
                          'opacity 0.15s ease, r 0.15s ease',
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
                          event.currentTarget
                            .ownerSVGElement
                            ?.getBoundingClientRect();

                        if (
                          bounds
                        ) {
                          const scaleX =
                            bounds.width /
                            mapWidth;

                          const scaleY =
                            bounds.height /
                            mapHeight;

                          setMapTooltip(
                            {
                              x:
                                x *
                                scaleX,
                              y:
                                y *
                                scaleY,
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
                  color: 'white',
                  padding:
                    '10px 12px',
                  borderRadius:
                    '7px',
                  pointerEvents:
                    'none',
                  fontSize:
                    '13px',
                  lineHeight: 1.4,
                  zIndex: 10,
                  minWidth:
                    '180px',
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
                <strong>
                  {
                    mapTooltip
                      .hospital[
                      'Hospital overall rating'
                    ]
                  }
                  /5
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* RANKED BAR VIEW */}
        <div
          style={{
            background:
              'white',
            padding: '22px',
            border:
              '1px solid #d9e0e8',
            borderRadius:
              '10px',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              marginBottom:
                '5px',
            }}
          >
            Hospital Overall
            Rating
          </h2>

          <p
            style={{
              color: '#64748b',
              fontSize: '14px',
              marginBottom:
                '14px',
            }}
          >
            Hover over a hospital
            to link it with its
            location on the map.
            Click a hospital for
            detailed comparison.
          </p>

          <div
            style={{
              marginBottom:
                '12px',
            }}
          >
            <strong>
              {
                filteredHospitals.length
              }
            </strong>{' '}
            hospitals match the
            current filters
          </div>

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

                    const legendMatch =
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

                          setTooltip(
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
                            hovered
                              ? 'bold'
                              : 'normal'
                          }
                          opacity={
                            legendMatch
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
                            legendMatch
                              ? 0.85
                              : 0.1
                          }
                          stroke={
                            selected ||
                            hovered
                              ? '#111827'
                              : 'none'
                          }
                          strokeWidth={
                            selected
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
                          onMouseEnter={() => {
                            setTooltip(
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
                            );
                          }}
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
                            legendMatch
                              ? 1
                              : 0.25
                          }
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
                  position:
                    'absolute',
                  left:
                    tooltip.x,
                  top:
                    tooltip.y -
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
                  zIndex: 10,
                }}
              >
                <strong>
                  {
                    tooltip
                      .hospital[
                      'Facility Name'
                    ]
                  }
                </strong>

                <br />

                {
                  tooltip
                    .hospital[
                    'City/Town'
                  ]
                }
                ,{' '}
                {
                  tooltip
                    .hospital
                    .State
                }

                <br />

                Rating:{' '}
                {
                  tooltip
                    .hospital[
                    'Hospital overall rating'
                  ]
                }
                /5
              </div>
            )}
          </div>

          {/* PAGINATION */}
          <div
            style={{
              display: 'flex',
              justifyContent:
                'center',
              alignItems:
                'center',
              gap: '14px',
              marginTop:
                '10px',
            }}
          >
            <button
              disabled={
                page === 1
              }
              onClick={() =>
                setPage(
                  (oldPage) =>
                    Math.max(
                      1,
                      oldPage -
                        1,
                    ),
                )
              }
              style={{
                padding:
                  '7px 12px',
              }}
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
                  (oldPage) =>
                    Math.min(
                      totalPages,
                      oldPage +
                        1,
                    ),
                )
              }
              style={{
                padding:
                  '7px 12px',
              }}
            >
              Next
            </button>
          </div>
        </div>

        {/* SELECTED HOSPITAL */}
        {selectedHospital && (
          <div
            style={{
              marginTop:
                '24px',
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
                fontWeight:
                  750,
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

            <h3
              style={{
                fontSize:
                  '18px',
                fontWeight:
                  700,
                marginBottom:
                  '12px',
              }}
            >
              Compared with
              Current Group
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
                marginTop:
                  '18px',
                color:
                  '#64748b',
                fontSize:
                  '13px',
              }}
            >
              Comparison group =
              all hospitals
              currently matching
              the selected filters.
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
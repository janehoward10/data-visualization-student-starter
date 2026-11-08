import {
    useEffect,
    useMemo,
    useState,
  } from 'react';
  
  import {
    csv,
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
    'Count of Facility TE Measures': string;
  };
  
  type BenchmarkGroup = {
    label: string;
    shortLabel: string;
  
    totalField:
      | 'Count of Facility MORT Measures'
      | 'Count of Facility Safety Measures'
      | 'Count of Facility READM Measures';
  
    betterField:
      | 'Count of MORT Measures Better'
      | 'Count of Safety Measures Better'
      | 'Count of READM Measures Better';
  
    sameField:
      | 'Count of MORT Measures No Different'
      | 'Count of Safety Measures No Different'
      | 'Count of READM Measures No Different';
  
    worseField:
      | 'Count of MORT Measures Worse'
      | 'Count of Safety Measures Worse'
      | 'Count of READM Measures Worse';
  
    explanation: string;
  };
  
  type TooltipInfo = {
    x: number;
    y: number;
    title: string;
    text: string;
  } | null;
  
  const benchmarkGroups: BenchmarkGroup[] = [
    {
      label: 'Mortality',
      shortLabel: 'Mortality',
      totalField: 'Count of Facility MORT Measures',
      betterField: 'Count of MORT Measures Better',
      sameField:
        'Count of MORT Measures No Different',
      worseField: 'Count of MORT Measures Worse',
      explanation:
        'Mortality measures compare outcomes related to patient deaths for selected conditions and procedures. "Better" means CMS classified the hospital as performing better than the comparison benchmark for that measure.',
    },
    {
      label: 'Safety',
      shortLabel: 'Safety',
      totalField: 'Count of Facility Safety Measures',
      betterField: 'Count of Safety Measures Better',
      sameField:
        'Count of Safety Measures No Different',
      worseField: 'Count of Safety Measures Worse',
      explanation:
        'Safety measures summarize selected hospital safety outcomes. A measure classified as "better" performed better than the CMS comparison benchmark, while "worse" performed worse.',
    },
    {
      label: 'Readmission',
      shortLabel: 'Readmission',
      totalField: 'Count of Facility READM Measures',
      betterField: 'Count of READM Measures Better',
      sameField:
        'Count of READM Measures No Different',
      worseField: 'Count of READM Measures Worse',
      explanation:
        'Readmission measures evaluate whether patients return to the hospital after discharge for selected conditions. Lower readmission performance can be classified as better than the comparison benchmark.',
    },
  ];
  
  function numberValue(value: string | undefined) {
    if (
      value === undefined ||
      value === null ||
      value.trim() === ''
    ) {
      return 0;
    }
  
    const parsed = Number(value);
  
    return Number.isNaN(parsed)
      ? 0
      : parsed;
  }
  
  function ratingColor(rating: number) {
    if (rating === 5) return '#247a5a';
    if (rating === 4) return '#55a36d';
    if (rating === 3) return '#d4a72c';
    if (rating === 2) return '#d97941';
  
    return '#b84a4a';
  }
  
  export function HospitalProfileExplorer() {
    const [hospitals, setHospitals] =
      useState<HospitalRow[]>([]);
  
    const [loading, setLoading] =
      useState(true);
  
    const [
      selectedFacilityId,
      setSelectedFacilityId,
    ] = useState('');
  
    const [
      searchText,
      setSearchText,
    ] = useState('');
  
    const [tooltip, setTooltip] =
      useState<TooltipInfo>(null);
  
    useEffect(() => {
      csv(
        `${import.meta.env.BASE_URL}data/hospital-quality/hospital-general-information.csv`,
      )
        .then((rows) => {
          const parsed =
            rows as unknown as HospitalRow[];
  
          const valid = parsed.filter(
            (hospital) => {
              const rating = numberValue(
                hospital[
                  'Hospital overall rating'
                ],
              );
  
              return (
                hospital['Facility ID'] &&
                hospital['Facility Name'] &&
                rating >= 1 &&
                rating <= 5
              );
            },
          );
  
          valid.sort((a, b) =>
            a['Facility Name'].localeCompare(
              b['Facility Name'],
            ),
          );
  
          setHospitals(valid);
  
          if (valid.length > 0) {
            const maHospital =
              valid.find(
                (hospital) =>
                  hospital.State === 'MA',
              ) ?? valid[0];
  
            setSelectedFacilityId(
              maHospital['Facility ID'],
            );
          }
  
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
  
    const filteredOptions =
      useMemo(() => {
        const search =
          searchText
            .trim()
            .toLowerCase();
  
        if (!search) {
          return hospitals;
        }
  
        return hospitals.filter(
          (hospital) =>
            hospital['Facility Name']
              .toLowerCase()
              .includes(search) ||
            hospital['City/Town']
              .toLowerCase()
              .includes(search) ||
            hospital.State
              .toLowerCase()
              .includes(search),
        );
      }, [
        hospitals,
        searchText,
      ]);
  
    const selectedHospital =
      useMemo(() => {
        return (
          hospitals.find(
            (hospital) =>
              hospital[
                'Facility ID'
              ] ===
              selectedFacilityId,
          ) ?? null
        );
      }, [
        hospitals,
        selectedFacilityId,
      ]);
  
    const maxReportedMeasures =
      useMemo(() => {
        if (!selectedHospital) {
          return 1;
        }
  
        return Math.max(
          1,
          ...benchmarkGroups.map(
            (group) =>
              numberValue(
                selectedHospital[
                  group.totalField
                ],
              ),
          ),
          numberValue(
            selectedHospital[
              'Count of Facility Pt Exp Measures'
            ],
          ),
          numberValue(
            selectedHospital[
              'Count of Facility TE Measures'
            ],
          ),
        );
      }, [selectedHospital]);
  
    const reportScale =
      scaleLinear()
        .domain([
          0,
          maxReportedMeasures,
        ])
        .range([0, 100]);
  
    function showInfoTooltip(
      event:
        | React.MouseEvent
        | React.FocusEvent,
      title: string,
      text: string,
    ) {
      const target =
        event.currentTarget.getBoundingClientRect();
  
      setTooltip({
        x:
          target.left +
          target.width / 2,
        y: target.bottom + 8,
        title,
        text,
      });
    }
  
    if (loading) {
      return (
        <div
          style={{
            padding: '40px',
          }}
        >
          Loading hospital data...
        </div>
      );
    }
  
    if (!selectedHospital) {
      return (
        <div
          style={{
            padding: '40px',
          }}
        >
          No hospital data available.
        </div>
      );
    }
  
    const overallRating =
      numberValue(
        selectedHospital[
          'Hospital overall rating'
        ],
      );
  
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          alignSelf: 'stretch',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#f7f9fc',
          padding: '36px 32px 60px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
          }}
        >
          {/* HEADER */}
  
          <header
            style={{
              marginBottom: '24px',
            }}
          >
            <h1
              style={{
                fontSize: '34px',
                marginBottom: '7px',
              }}
            >
              Hospital Quality Profile
            </h1>
  
            <p
              style={{
                fontSize: '17px',
                color: '#334155',
                maxWidth: '820px',
                lineHeight: 1.5,
                marginBottom: '5px',
              }}
            >
              Explore how an individual
              hospital performs across several
              CMS quality categories.
            </p>
  
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                maxWidth: '850px',
                lineHeight: 1.5,
              }}
            >
              This visualization was inspired
              by the Hospital Profiles
              prototype generated with VizHub.
              Benchmark categories are shown
              as percentages so groups with
              different numbers of reported
              measures can be compared more
              easily.
            </p>
          </header>
  
          {/* HOSPITAL SELECTOR */}
  
          <section
            style={{
              background: 'white',
              border:
                '1px solid #d9e0e8',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '22px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
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
                  Search hospitals
                </div>
  
                <input
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(
                      event.target.value,
                    )
                  }
                  placeholder="Hospital, city, or state"
                  style={{
                    padding: '9px',
                    minWidth: '250px',
                  }}
                />
              </label>
  
              <label
                style={{
                  flex: 1,
                  minWidth: '320px',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: '5px',
                  }}
                >
                  Facility
                </div>
  
                <select
                  value={selectedFacilityId}
                  onChange={(event) =>
                    setSelectedFacilityId(
                      event.target.value,
                    )
                  }
                  style={{
                    padding: '9px',
                    width: '100%',
                  }}
                >
                  {filteredOptions.map(
                    (hospital) => (
                      <option
                        key={
                          hospital[
                            'Facility ID'
                          ]
                        }
                        value={
                          hospital[
                            'Facility ID'
                          ]
                        }
                      >
                        {
                          hospital[
                            'Facility Name'
                          ]
                        }{' '}
                        —{' '}
                        {
                          hospital[
                            'City/Town'
                          ]
                        }
                        , {hospital.State}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
          </section>
  
          {/* HOSPITAL SUMMARY */}
  
          <section
            style={{
              background: 'white',
              border:
                '1px solid #d9e0e8',
              borderRadius: '10px',
              padding: '22px',
              marginBottom: '22px',
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
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '25px',
                    marginBottom: '5px',
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
                    marginBottom: '3px',
                  }}
                >
                  {
                    selectedHospital[
                      'City/Town'
                    ]
                  }
                  , {selectedHospital.State}
                </p>
  
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '14px',
                    marginBottom: '3px',
                  }}
                >
                  {
                    selectedHospital[
                      'Hospital Type'
                    ]
                  }
                </p>
  
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                >
                  {
                    selectedHospital[
                      'Hospital Ownership'
                    ]
                  }
                </p>
              </div>
  
              <div
                style={{
                  minWidth: '140px',
                  background: '#f8fafc',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius: '9px',
                  padding:
                    '13px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom: '4px',
                  }}
                >
                  CMS Overall Rating
                </div>
  
                <div
                  style={{
                    fontSize: '30px',
                    fontWeight: 800,
                    color:
                      ratingColor(
                        overallRating,
                      ),
                  }}
                >
                  {overallRating}/5
                </div>
              </div>
            </div>
          </section>
  
          {/* MAIN PROFILE */}
  
          <section
            style={{
              background: 'white',
              border:
                '1px solid #d9e0e8',
              borderRadius: '10px',
              padding: '24px',
              marginBottom: '22px',
            }}
          >
            <h2
              style={{
                fontSize: '22px',
                marginBottom: '5px',
              }}
            >
              Benchmark Performance Profile
            </h2>
  
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                lineHeight: 1.5,
                marginBottom: '18px',
              }}
            >
              Each bar represents 100% of the
              measures reported for that
              category. Hover over the info
              icons for definitions.
            </p>
  
            {/* LEGEND */}
  
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
                fontSize: '13px',
              }}
            >
              <LegendItem
                color="#24975a"
                label="Better"
              />
  
              <LegendItem
                color="#bfc4c9"
                label="No different"
              />
  
              <LegendItem
                color="#d93a31"
                label="Worse"
              />
  
              <LegendItem
                color="#e5e7eb"
                label="Unclassified / unavailable"
              />
            </div>
  
            {benchmarkGroups.map(
              (group) => {
                const total =
                  numberValue(
                    selectedHospital[
                      group.totalField
                    ],
                  );
  
                const better =
                  numberValue(
                    selectedHospital[
                      group.betterField
                    ],
                  );
  
                const same =
                  numberValue(
                    selectedHospital[
                      group.sameField
                    ],
                  );
  
                const worse =
                  numberValue(
                    selectedHospital[
                      group.worseField
                    ],
                  );
  
                const classified =
                  better +
                  same +
                  worse;
  
                const unclassified =
                  Math.max(
                    0,
                    total -
                      classified,
                  );
  
                const denominator =
                  Math.max(
                    total,
                    classified,
                    1,
                  );
  
                const betterPct =
                  (better /
                    denominator) *
                  100;
  
                const samePct =
                  (same /
                    denominator) *
                  100;
  
                const worsePct =
                  (worse /
                    denominator) *
                  100;
  
                const unavailablePct =
                  (unclassified /
                    denominator) *
                  100;
  
                return (
                  <div
                    key={group.label}
                    style={{
                      marginBottom:
                        '25px',
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: '7px',
                        marginBottom:
                          '7px',
                      }}
                    >
                      <strong>
                        {
                          group.shortLabel
                        }
                      </strong>
  
                      <button
                        type="button"
                        aria-label={`Explain ${group.label}`}
                        onMouseEnter={(
                          event,
                        ) =>
                          showInfoTooltip(
                            event,
                            group.label,
                            group.explanation,
                          )
                        }
                        onMouseLeave={() =>
                          setTooltip(
                            null,
                          )
                        }
                        onFocus={(
                          event,
                        ) =>
                          showInfoTooltip(
                            event,
                            group.label,
                            group.explanation,
                          )
                        }
                        onBlur={() =>
                          setTooltip(
                            null,
                          )
                        }
                        style={{
                          width: '22px',
                          height:
                            '22px',
                          borderRadius:
                            '50%',
                          border:
                            '1px solid #94a3b8',
                          background:
                            'white',
                          cursor:
                            'help',
                          fontSize:
                            '12px',
                        }}
                      >
                        i
                      </button>
  
                      <span
                        style={{
                          marginLeft:
                            'auto',
                          color:
                            '#64748b',
                          fontSize:
                            '13px',
                        }}
                      >
                        {total}{' '}
                        reported
                      </span>
                    </div>
  
                    {total === 0 &&
                    classified ===
                      0 ? (
                      <div
                        style={{
                          padding:
                            '12px',
                          background:
                            '#f8fafc',
                          color:
                            '#64748b',
                          borderRadius:
                            '6px',
                          fontSize:
                            '13px',
                        }}
                      >
                        No reported measures
                        for this hospital.
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display:
                              'flex',
                            width:
                              '100%',
                            height:
                              '28px',
                            borderRadius:
                              '6px',
                            overflow:
                              'hidden',
                            background:
                              '#e5e7eb',
                          }}
                        >
                          {betterPct >
                            0 && (
                            <div
                              title={`${better} better (${betterPct.toFixed(
                                1,
                              )}%)`}
                              style={{
                                width:
                                  `${betterPct}%`,
                                background:
                                  '#24975a',
                              }}
                            />
                          )}
  
                          {samePct >
                            0 && (
                            <div
                              title={`${same} no different (${samePct.toFixed(
                                1,
                              )}%)`}
                              style={{
                                width:
                                  `${samePct}%`,
                                background:
                                  '#bfc4c9',
                              }}
                            />
                          )}
  
                          {worsePct >
                            0 && (
                            <div
                              title={`${worse} worse (${worsePct.toFixed(
                                1,
                              )}%)`}
                              style={{
                                width:
                                  `${worsePct}%`,
                                background:
                                  '#d93a31',
                              }}
                            />
                          )}
  
                          {unavailablePct >
                            0 && (
                            <div
                              title={`${unclassified} measures without a benchmark classification`}
                              style={{
                                width:
                                  `${unavailablePct}%`,
                                background:
                                  '#e5e7eb',
                              }}
                            />
                          )}
                        </div>
  
                        <div
                          style={{
                            display:
                              'flex',
                            flexWrap:
                              'wrap',
                            gap: '14px',
                            marginTop:
                              '7px',
                            fontSize:
                              '12px',
                            color:
                              '#64748b',
                          }}
                        >
                          <span>
                            Better:{' '}
                            <strong>
                              {better}
                            </strong>{' '}
                            (
                            {betterPct.toFixed(
                              1,
                            )}
                            %)
                          </span>
  
                          <span>
                            No different:{' '}
                            <strong>
                              {same}
                            </strong>{' '}
                            (
                            {samePct.toFixed(
                              1,
                            )}
                            %)
                          </span>
  
                          <span>
                            Worse:{' '}
                            <strong>
                              {worse}
                            </strong>{' '}
                            (
                            {worsePct.toFixed(
                              1,
                            )}
                            %)
                          </span>
  
                          {unclassified >
                            0 && (
                            <span>
                              Other /
                              unavailable:{' '}
                              <strong>
                                {
                                  unclassified
                                }
                              </strong>
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              },
            )}
          </section>
  
          {/* ADDITIONAL MEASURE COUNTS */}
  
          <section
            style={{
              background: 'white',
              border:
                '1px solid #d9e0e8',
              borderRadius: '10px',
              padding: '24px',
              marginBottom: '22px',
            }}
          >
            <h2
              style={{
                fontSize: '22px',
                marginBottom: '5px',
              }}
            >
              Additional Reported Measures
            </h2>
  
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                lineHeight: 1.5,
                marginBottom: '20px',
              }}
            >
              This CMS file reports the
              number of Patient Experience
              and Timely &amp; Effective Care
              measures, but does not provide
              Better / No Different / Worse
              counts for these groups.
              Therefore these bars represent
              reported measure counts only.
            </p>
  
            <ReportedMeasureRow
              label="Patient Experience"
              value={numberValue(
                selectedHospital[
                  'Count of Facility Pt Exp Measures'
                ],
              )}
              width={reportScale(
                numberValue(
                  selectedHospital[
                    'Count of Facility Pt Exp Measures'
                  ],
                ),
              )}
              explanation="Patient Experience includes measures related to patients' experiences of care. This file reports how many measures are available, but not Better / No Different / Worse classifications."
              showInfoTooltip={
                showInfoTooltip
              }
              clearTooltip={() =>
                setTooltip(null)
              }
            />
  
            <ReportedMeasureRow
              label="Timely & Effective Care"
              value={numberValue(
                selectedHospital[
                  'Count of Facility TE Measures'
                ],
              )}
              width={reportScale(
                numberValue(
                  selectedHospital[
                    'Count of Facility TE Measures'
                  ],
                ),
              )}
              explanation="Timely & Effective Care includes measures related to whether patients receive recommended care in an appropriate and timely way. This file reports measure counts but not the benchmark breakdown used for the categories above."
              showInfoTooltip={
                showInfoTooltip
              }
              clearTooltip={() =>
                setTooltip(null)
              }
            />
          </section>
  
          {/* DATA INTERPRETATION NOTE */}
  
          <section
            style={{
              padding:
                '17px 20px',
              border:
                '1px solid #d9e0e8',
              borderRadius:
                '10px',
              background:
                '#f8fafc',
            }}
          >
            <strong>
              How to interpret zero and
              missing values
            </strong>
  
            <p
              style={{
                marginTop: '7px',
                marginBottom: 0,
                color: '#64748b',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              A value of zero for
              &quot;Better&quot; means that
              none of the reported measures
              were classified as better than
              the benchmark. That is
              different from a category for
              which no measures were reported
              or for which this dataset does
              not contain a benchmark
              classification.
            </p>
          </section>
        </div>
  
        {tooltip && (
          <div
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              transform:
                'translateX(-50%)',
              maxWidth: '310px',
              background:
                '#111827',
              color: 'white',
              padding:
                '10px 12px',
              borderRadius: '7px',
              fontSize: '13px',
              lineHeight: 1.45,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <strong>
              {tooltip.title}
            </strong>
  
            <div
              style={{
                marginTop: '4px',
              }}
            >
              {tooltip.text}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  function LegendItem({
    color,
    label,
  }: {
    color: string;
    label: string;
  }) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '2px',
            background: color,
            border:
              color === '#e5e7eb'
                ? '1px solid #cbd5e1'
                : 'none',
          }}
        />
  
        {label}
      </div>
    );
  }
  
  function ReportedMeasureRow({
    label,
    value,
    width,
    explanation,
    showInfoTooltip,
    clearTooltip,
  }: {
    label: string;
    value: number;
    width: number;
    explanation: string;
  
    showInfoTooltip: (
      event:
        | React.MouseEvent
        | React.FocusEvent,
      title: string,
      text: string,
    ) => void;
  
    clearTooltip: () => void;
  }) {
    return (
      <div
        style={{
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            marginBottom: '7px',
          }}
        >
          <strong>
            {label}
          </strong>
  
          <button
            type="button"
            aria-label={`Explain ${label}`}
            onMouseEnter={(event) =>
              showInfoTooltip(
                event,
                label,
                explanation,
              )
            }
            onMouseLeave={
              clearTooltip
            }
            onFocus={(event) =>
              showInfoTooltip(
                event,
                label,
                explanation,
              )
            }
            onBlur={
              clearTooltip
            }
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              border:
                '1px solid #94a3b8',
              background: 'white',
              cursor: 'help',
              fontSize: '12px',
            }}
          >
            i
          </button>
  
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            {value} reported
          </span>
        </div>
  
        <div
          style={{
            height: '20px',
            background:
              '#e5e7eb',
            borderRadius: '5px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${width}%`,
              background:
                '#64748b',
            }}
          />
        </div>
      </div>
    );
  }
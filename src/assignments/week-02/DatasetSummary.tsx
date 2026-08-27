import { useEffect, useState } from 'react';
import { csv } from 'd3';

type Row = Record<string, string>;

export function DatasetSummary() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    csv(
      `${import.meta.env.BASE_URL}data/mta-subway-reliability/mta-subway-reliability.csv`,
    )
      .then((loadedData) => {
        setData(loadedData as Row[]);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load dataset.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">Loading dataset...</div>;
  }

  if (error) {
    return <div className="p-8">{error}</div>;
  }

  if (data.length === 0) {
    return <div className="p-8">No data found.</div>;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-2">
        MTA Subway Reliability
      </h1>

      <p className="mb-6">
        Mean Distance Between Failures for New York City subway cars.
      </p>

      <h2 className="text-xl font-bold mb-2">
        Dataset Summary
      </h2>

      <p>
        <strong>Rows:</strong> {data.length}
      </p>

      <p className="mb-6">
        <strong>Columns:</strong> {columns.length}
      </p>

      <h2 className="text-xl font-bold mb-2">
        Column Names
      </h2>

      <ul className="list-disc pl-6 mb-6">
        {columns.map((column) => (
          <li key={column}>{column}</li>
        ))}
      </ul>

      <h2 className="text-xl font-bold mb-2">
        First 10 Rows
      </h2>

      <div className="overflow-x-auto">
        <table className="border-collapse border">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border px-3 py-2"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.slice(0, 10).map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td
                    key={column}
                    className="border px-3 py-2"
                  >
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
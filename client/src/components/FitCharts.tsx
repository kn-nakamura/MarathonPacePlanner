import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FitChartProps {
  fitData: any;
}

export default function FitCharts({ fitData }: FitChartProps) {
  // Prepare data for charts by mapping records
  const records = fitData.records.map((r: any, index: number) => ({
    index,
    time: new Date(r.timestamp).toLocaleTimeString(),
    heartRate: r.heart_rate,
    altitude: r.altitude,
    speed: r.speed,
    cadence: r.cadence,
    // Calculate pace from speed (if available)
    pace: r.speed ? calculatePaceFromSpeed(r.speed) : null
  }));

  // Filter data to reduce points for better performance
  const filteredData = filterDataPoints(records, 100);

  return (
    <div className="space-y-8">
      {/* Heart Rate Chart */}
      {hasValidData(filteredData, 'heartRate') && (
        <div>
          <h3 className="text-base font-medium mb-2">Heart Rate</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#555555" strokeOpacity={0.2} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(value) => `${value} bpm`}
              />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }} />
              <Line
                type="monotone"
                dataKey="heartRate"
                name="Heart Rate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Altitude Chart */}
      {hasValidData(filteredData, 'altitude') && (
        <div>
          <h3 className="text-base font-medium mb-2">Altitude</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#555555" strokeOpacity={0.2} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']}
                tickFormatter={(value) => `${value} m`}
              />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }} />
              <Line
                type="monotone"
                dataKey="altitude"
                name="Altitude"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Speed Chart */}
      {hasValidData(filteredData, 'speed') && (
        <div>
          <h3 className="text-base font-medium mb-2">Speed / Pace</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#555555" strokeOpacity={0.2} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis 
                yAxisId="speed"
                orientation="left"
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(value) => `${value} km/h`}
              />
              <YAxis 
                yAxisId="pace"
                orientation="right"
                domain={[240, 720]}
                tickFormatter={(value) => formatPace(value)}
                reversed={true}
              />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }} />
              <Line
                type="monotone"
                dataKey="speed"
                name="Speed"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                yAxisId="speed"
              />
              <Line
                type="monotone"
                dataKey="pace"
                name="Pace"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                yAxisId="pace"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cadence Chart */}
      {hasValidData(filteredData, 'cadence') && (
        <div>
          <h3 className="text-base font-medium mb-2">Cadence</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#555555" strokeOpacity={0.2} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(value) => `${value} spm`}
              />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }} />
              <Line
                type="monotone"
                dataKey="cadence"
                name="Cadence"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Helper function to convert speed (km/h) to pace (seconds per km)
function calculatePaceFromSpeed(speed: number): number | null {
  if (!speed || speed < 0.1) return null; // Avoid division by zero or extremely slow speeds
  return 3600 / speed; // Convert km/h to seconds per km
}

// Format pace from seconds to MM:SS format
function formatPace(seconds: number): string {
  if (!seconds || seconds < 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

// Filter data points to improve chart performance
function filterDataPoints(data: any[], maxPoints: number): any[] {
  if (!data || data.length <= maxPoints) return data;
  
  const interval = Math.ceil(data.length / maxPoints);
  return data.filter((_: any, i: number) => i % interval === 0);
}

// Check if the data contains valid values for a specific field
function hasValidData(data: any[], field: string): boolean {
  if (!data || data.length === 0) return false;
  return data.some(item => item[field] != null && !isNaN(item[field]));
}
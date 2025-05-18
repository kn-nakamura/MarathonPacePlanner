import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FitChartProps {
  fitData: any;
}

export default function FitCharts({ fitData }: FitChartProps) {
  // Prepare data for charts
  const records = fitData.records.map((r: any) => ({
    time: new Date(r.timestamp).toLocaleTimeString(),
    heartRate: r.heart_rate,
    altitude: r.altitude,
    speed: r.speed
  }))

  return (
    <div className="space-y-8 mt-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Heart Rate</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={records}>
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={['dataMin', 'dataMax']} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="heartRate" 
              name="Heart Rate (bpm)" 
              stroke="#ef4444" 
              dot={false} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Altitude</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={records}>
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={['dataMin', 'dataMax']} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="altitude" 
              name="Altitude (m)" 
              stroke="#3b82f6" 
              dot={false} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Speed</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={records}>
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={['dataMin', 'dataMax']} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="speed" 
              name="Speed (km/h)" 
              stroke="#10b981" 
              dot={false} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
// client/src/pages/FitUploadPage.tsx

import React, { useState } from 'react'
import FitParser from 'fit-file-parser'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import FitMap from '../components/FitMap'
import FitCharts from '../components/FitCharts'
import { convertToCsv, buildTcx, buildGpx } from '../utils/fitConverters'

export default function FitUploadPage() {
  const [fitData, setFitData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('Selected file:', file.name, file.size)

    if (!/\.fit$/i.test(file.name)) {
      setError('Please upload a file with the .FIT extension.')
      return
    }

    setLoading(true)
    setError(null)
    setFitData(null)

    try {
      const buffer = await file.arrayBuffer()
      const parser = new FitParser({
        mode: 'list',        // ensure data.records is always populated
        speedUnit: 'km/h',
        lengthUnit: 'km',
      })

      parser.parse(buffer, (err: Error | null, data: any) => {
        setLoading(false)

        if (err) {
          console.error('Error parsing FIT file:', err)
          setError('Failed to parse FIT file. Please make sure it is a valid .FIT file.')
          return
        }

        if (!data?.records?.length) {
          setError('No workout records found in the FIT file.')
          return
        }

        setFitData(data)
      })
    } catch (err) {
      setLoading(false)
      console.error('Unexpected error reading file:', err)
      setError('An unexpected error occurred while reading the file.')
    }
  }

  const downloadCsv = () => {
    if (!fitData?.records) return
    const csv = convertToCsv(fitData.records)
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'activity.csv')
  }

  const downloadTcx = () => {
    if (!fitData?.records) return
    const tcx = buildTcx(fitData.records)
    saveAs(new Blob([tcx], { type: 'application/xml' }), 'activity.tcx')
  }

  const downloadGpx = () => {
    if (!fitData?.records) return
    const gpx = buildGpx(fitData.records)
    saveAs(new Blob([gpx], { type: 'application/xml' }), 'activity.gpx')
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">FIT File Analyzer</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload FIT File</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Choose a .FIT file from your GPS device to analyze your workout data.
          </p>

          <div className="relative inline-block">
            {/* Invisible overlay so the Button can trigger the file dialog */}
            <input
              type="file"
              accept=".fit"
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button disabled={loading}>Choose FIT File</Button>
          </div>
          {loading && <span className="ml-4 text-muted-foreground">Processing...</span>}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {fitData && (
        <>
          {/* Activity Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Device</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.device_info?.[0]?.manufacturer || 'Unknown'}{' '}
                    {fitData.device_info?.[0]?.product_name || ''}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Sport</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.session?.[0]?.sport || 'Unknown'}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Duration</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.session?.[0]?.total_timer_time
                      ? formatDuration(fitData.session[0].total_timer_time)
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Distance</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.session?.[0]?.total_distance
                      ? `${(fitData.session[0].total_distance / 1000).toFixed(2)} km`
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Map */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Activity Map</CardTitle>
            </CardHeader>
            <CardContent>
              <FitMap records={fitData.records} />
            </CardContent>
          </Card>

          {/* Data Visualization */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <FitCharts fitData={fitData} />
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={downloadCsv}>Download CSV</Button>
                <Button variant="outline" onClick={downloadTcx}>
                  Download TCX
                </Button>
                <Button variant="outline" onClick={downloadGpx}>
                  Download GPX
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/** format seconds as HH:MM:SS */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return [hours, minutes, secs]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':')
}
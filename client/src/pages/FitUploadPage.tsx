import { useState } from 'react'
import { FitParser } from 'fit-file-parser'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import FitCharts from '../components/FitCharts'
import { convertToCsv, buildTcx, buildGpx } from '../utils/fitConverters'

export default function FitUploadPage() {
  const [fitData, setFitData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Reset state
    setLoading(true)
    setError(null)
    setFitData(null)
    
    // Check if file is a FIT file (or at least has the right extension)
    if (!file.name.toLowerCase().endsWith('.fit')) {
      setLoading(false)
      setError('Please upload a file with .FIT extension.')
      return
    }
    
    try {
      const buffer = await file.arrayBuffer()
      
      // Parse FIT file with better error handling
      const parser = new FitParser({ 
        mode: 'cascade',
        speedUnit: 'km/h',
        lengthUnit: 'km' 
      })
      
      parser.parse(buffer, (err: Error | null, data: any) => {
        setLoading(false)
        
        if (err) {
          console.error('Error parsing FIT file:', err)
          setError('Failed to parse FIT file. Make sure it\'s a valid .FIT format from a GPS device.')
          return
        }
        
        // Check if the file contains the necessary data
        if (!data) {
          setError('The file couldn\'t be processed. It may be corrupted.')
          return
        }
        
        if (!data.records || data.records.length === 0) {
          setError('The FIT file doesn\'t contain any workout record data.')
          return
        }
        
        // Log the data structure to help with debugging
        console.log('FIT data structure:', Object.keys(data))
        
        // Success!
        setFitData(data)
      })
    } catch (err) {
      setLoading(false)
      console.error('Error processing file:', err)
      setError('Failed to process the file. The file may be corrupt or not a valid FIT format.')
    }
  }

  const downloadCsv = () => {
    if (!fitData || !fitData.records) return
    const csvContent = convertToCsv(fitData.records)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, 'activity.csv')
  }

  const downloadTcx = () => {
    if (!fitData || !fitData.records) return
    const tcxContent = buildTcx(fitData.records)
    const blob = new Blob([tcxContent], { type: 'application/xml' })
    saveAs(blob, 'activity.tcx')
  }

  const downloadGpx = () => {
    if (!fitData || !fitData.records) return
    const gpxContent = buildGpx(fitData.records)
    const blob = new Blob([gpxContent], { type: 'application/xml' })
    saveAs(blob, 'activity.gpx')
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
            Upload a .FIT file from your GPS device to analyze your workout data and export in different formats.
          </p>
          
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md">
              Choose File
              <input 
                type="file" 
                accept=".fit" 
                onChange={onFileChange} 
                className="hidden" 
              />
            </label>
            {loading && <span>Processing...</span>}
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {fitData && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Device Info</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.device_info?.[0]?.manufacturer || 'Unknown'} {fitData.device_info?.[0]?.product_name || ''}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium">Activity Type</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.session?.[0]?.sport || 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium">Duration</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.session?.[0]?.total_timer_time ? 
                      formatDuration(fitData.session[0].total_timer_time) : 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium">Distance</h3>
                  <p className="text-sm text-muted-foreground">
                    {fitData.session?.[0]?.total_distance ? 
                      `${(fitData.session[0].total_distance / 1000).toFixed(2)} km` : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <FitCharts fitData={fitData} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={downloadCsv}>
                  Download CSV
                </Button>
                <Button onClick={downloadTcx} variant="outline">
                  Download TCX
                </Button>
                <Button onClick={downloadGpx} variant="outline">
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':')
}
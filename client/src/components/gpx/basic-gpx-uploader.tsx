import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Info, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ReferenceLine
} from 'recharts';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap } from 'react-leaflet';
import L, { LatLngTuple, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Segment } from '@/models/pace';
import { useIsMobile } from '@/hooks/use-mobile';
import { paceToSeconds, secondsToPace, calculateTotalTime } from '@/utils/pace-utils';

interface GPXUploaderProps {
  segments: Segment[];
  onUpdateSegments: (segments: Segment[]) => void;
}

interface ElevationPoint {
  distance: number;
  elevation: number;
  lat?: number;
  lon?: number;
}

// Fix Leaflet icon issue with webpack/vite
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

// Helper component to handle map bounds and behavior
const MapController = ({ points }: { points: LatLngExpression[] }) => {
  const map = useMap();
  
  useEffect(() => {
    // Disable scroll wheel zoom for better user experience
    map.scrollWheelZoom.disable();
    
    if (points.length > 0) {
      try {
        // Filter invalid points that might cause errors
        const validPoints = points.filter(p => 
          Array.isArray(p) && p.length === 2 && 
          !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
        ) as LatLngTuple[];
        
        if (validPoints.length > 1) {
          const bounds = L.latLngBounds(validPoints);
          map.fitBounds(bounds, { padding: [20, 20] });
        } else if (validPoints.length === 1) {
          map.setView(validPoints[0], 13);
        }
      } catch (error) {
        console.error("Error setting map bounds:", error);
        // Fallback to first point if there's an error
        if (points[0] && Array.isArray(points[0])) {
          map.setView(points[0] as LatLngTuple, 12);
        }
      }
    }
    
    // Add zoom control in bottom right
    const zoomControl = L.control.zoom({
      position: 'bottomright'
    });
    map.zoomControl?.remove();
    zoomControl.addTo(map);
    
    return () => {
      zoomControl.remove();
    };
  }, [map, points]);
  
  return null;
};

export function BasicGpxUploader({ segments, onUpdateSegments }: GPXUploaderProps) {
  const [elevationData, setElevationData] = useState<ElevationPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [totalElevGain, setTotalElevGain] = useState(0);
  const [totalElevLoss, setTotalElevLoss] = useState(0);
  const [mapPoints, setMapPoints] = useState<LatLngTuple[]>([]);
  const [segmentAnalysis, setSegmentAnalysis] = useState<{
    segmentName: string;
    startDist: number;
    endDist: number;
    elevGain: number;
    elevLoss: number;
    gradient: number;
    isUphill: boolean;
  }[]>([]);
  const [paceAdjustmentFactor, setPaceAdjustmentFactor] = useState<number>(1.0); // 1.0 = 100% of calculated adjustment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  
  // Initialize Leaflet icon
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  // Upload and parse GPX file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError('Only GPX files are supported');
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        parseGPX(content);
      } catch (err) {
        console.error('GPX parsing error:', err);
        setError('Failed to parse GPX file');
      }
    };
    reader.onerror = () => {
      setError('Error reading the file');
    };
    reader.readAsText(file);
  };

  // Parse GPX file
  const parseGPX = (gpxContent: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
      
      // Get track points
      const trackPoints = Array.from(xmlDoc.getElementsByTagName('trkpt'));
      
      if (trackPoints.length === 0) {
        setError('No track points found in GPX file');
        return;
      }
      
      const points: ElevationPoint[] = [];
      const mapCoordinates: LatLngTuple[] = [];
      let totalDistance = 0;
      let lastLat: number | null = null;
      let lastLon: number | null = null;
      let lastElevation: number | null = null;
      let elevGain = 0;
      let elevLoss = 0;
      
      // Process each track point
      trackPoints.forEach((point, index) => {
        const lat = parseFloat(point.getAttribute('lat') || '0');
        const lon = parseFloat(point.getAttribute('lon') || '0');
        
        // Get elevation
        const eleElement = point.getElementsByTagName('ele')[0];
        const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : 0;
        
        // Add to map coordinates
        mapCoordinates.push([lat, lon] as LatLngTuple);
        
        // For all points except the first, calculate distance and elevation changes
        if (index > 0 && lastLat !== null && lastLon !== null && lastElevation !== null) {
          // Distance calculation (Haversine formula)
          const R = 6371; // Earth radius in km
          const dLat = (lat - lastLat) * (Math.PI / 180);
          const dLon = (lon - lastLon) * (Math.PI / 180);
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lastLat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const segmentDistance = R * c; // Distance in km
          
          totalDistance += segmentDistance;
          
          // Calculate elevation change
          const elevDiff = elevation - lastElevation;
          if (elevDiff > 0) {
            elevGain += elevDiff;
          } else {
            elevLoss += Math.abs(elevDiff);
          }
        }
        
        // Add data points (reducing data points for performance)
        if (index === 0 || index === trackPoints.length - 1 || index % Math.max(1, Math.floor(trackPoints.length / 300)) === 0) {
          points.push({
            distance: parseFloat(totalDistance.toFixed(2)),
            elevation: Math.round(elevation),
            lat: lat,
            lon: lon
          });
        }
        
        lastLat = lat;
        lastLon = lon;
        lastElevation = elevation;
      });
      
      // Set elevation data
      setElevationData(points);
      
      // Set map points
      setMapPoints(mapCoordinates);
      
      // Set elevation statistics
      setTotalElevGain(Math.round(elevGain));
      setTotalElevLoss(Math.round(elevLoss));
      
      // Analyze segments based on current pace plan
      analyzeSegmentTerrain(points, segments);
      
    } catch (err) {
      console.error('GPX parsing error:', err);
      setError('Error parsing the GPX file');
    }
  };

  // Analyze segment terrain based on elevation data
  const analyzeSegmentTerrain = (points: ElevationPoint[], paceSegments: Segment[]) => {
    if (points.length === 0 || paceSegments.length === 0) return;
    
    const segmentAnalysisData = paceSegments.map(segment => {
      // Extract distance range from segment name (e.g., "0-5km" → [0, 5])
      const distanceMatch = segment.name.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
      
      // Try without "km" if first match fails
      const cleanName = segment.name.replace('km', '');
      const fallbackMatch = cleanName.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
      
      // Use either match
      const match = distanceMatch || fallbackMatch;
      
      if (!match) {
        console.log("Failed to parse segment name:", segment.name);
        return null;
      }
      
      const startDistance = parseFloat(match[1]);
      const endDistance = parseFloat(match[2]);
      
      // Find elevation points in this segment range
      const segmentElevData = points.filter(
        point => point.distance >= startDistance && point.distance <= endDistance
      );
      
      if (segmentElevData.length < 2) {
        console.log(`Insufficient elevation data for segment "${segment.name}" (${segmentElevData.length} points)`);
        return null;
      }
      
      // Calculate elevation gain/loss
      let segmentElevGain = 0;
      let segmentElevLoss = 0;
      
      for (let i = 1; i < segmentElevData.length; i++) {
        const elevDiff = segmentElevData[i].elevation - segmentElevData[i-1].elevation;
        if (elevDiff > 0) {
          segmentElevGain += elevDiff;
        } else {
          segmentElevLoss += Math.abs(elevDiff);
        }
      }
      
      // Calculate segment distance and gradient
      const segmentDistance = endDistance - startDistance;
      const startElev = segmentElevData[0].elevation;
      const endElev = segmentElevData[segmentElevData.length-1].elevation;
      const netElevChange = endElev - startElev;
      const avgGradient = (netElevChange / (segmentDistance * 1000)) * 100; // Gradient in %
      
      return {
        segmentName: segment.name,
        startDist: startDistance,
        endDist: endDistance,
        elevGain: Math.round(segmentElevGain),
        elevLoss: Math.round(segmentElevLoss),
        gradient: parseFloat(avgGradient.toFixed(2)),
        isUphill: avgGradient > 0
      };
    }).filter(Boolean) as {
      segmentName: string;
      startDist: number;
      endDist: number;
      elevGain: number;
      elevLoss: number;
      gradient: number;
      isUphill: boolean;
    }[];
    
    setSegmentAnalysis(segmentAnalysisData);
  };
  
  // Apply elevation-based pace adjustments
  const applyElevationToPacePlan = () => {
    if (elevationData.length === 0 || segments.length === 0) return;
    
    // Get original target time and total distance for reference
    const originalTotalTime = calculateTotalTime(segments);
    const totalDistance = segments[segments.length - 1].distance;
    
    // Calculate raw pace adjustments per segment
    const updatedSegments = segments.map((segment, index) => {
      // Extract distance range from segment name
      const distanceMatch = segment.name.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
      const cleanName = segment.name.replace('km', '');
      const fallbackMatch = cleanName.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
      const match = distanceMatch || fallbackMatch;
      
      if (!match) {
        console.log("Failed to parse segment name:", segment.name);
        return segment;
      }
      
      const startDistance = parseFloat(match[1]);
      const endDistance = parseFloat(match[2]);
      console.log(`Processing segment "${segment.name}": ${startDistance}km - ${endDistance}km`);
      
      // Find matching segment analysis
      const analysis = segmentAnalysis.find(s => 
        s.startDist === startDistance && s.endDist === endDistance
      );
      
      // Calculate segment distance
      const segmentDistance = endDistance - startDistance;
      
      // Calculate pace adjustment based on terrain
      let paceAdjustment = 0;
      
      // Apply elevation-based pace adjustment if analysis is available
      if (analysis) {
        // Pace adjustment logic: slower for uphills, faster for downhills
        if (analysis.gradient > 4 || (analysis.gradient > 2 && analysis.elevGain > 100)) {
          paceAdjustment = 30; // +30 sec/km for steep uphills
        } else if (analysis.gradient > 2 || (analysis.gradient > 1 && analysis.elevGain > 80)) {
          paceAdjustment = 20; // +20 sec/km for moderate uphills
        } else if (analysis.gradient > 0.5 || (analysis.gradient > 0 && analysis.elevGain > 50)) {
          paceAdjustment = 10; // +10 sec/km for gentle uphills
        } else if (analysis.gradient < -4 || (analysis.gradient < -2 && analysis.elevLoss > 100)) {
          paceAdjustment = -15; // -15 sec/km for steep downhills
        } else if (analysis.gradient < -2) {
          paceAdjustment = -8; // -8 sec/km for moderate downhills
        }
        
        console.log(`Segment "${segment.name}" terrain analysis:`, {
          'Elevation Gain': analysis.elevGain + "m",
          'Elevation Loss': analysis.elevLoss + "m", 
          'Gradient': analysis.gradient + "%",
          'Base Pace Adjustment': paceAdjustment + " sec/km"
        });
      }
      
      // Apply adjustment intensity factor (from slider)
      paceAdjustment = paceAdjustment * paceAdjustmentFactor;
      
      // Apply final pace adjustment (terrain only, splitStrategy is handled in the UI)
      const finalPaceAdjustment = paceAdjustment;
      
      console.log(`Segment "${segment.name}" pace adjustment calculation:`, {
        'Terrain Adjustment': paceAdjustment.toFixed(1) + " sec/km",
        'Final Adjustment': finalPaceAdjustment.toFixed(1) + " sec/km"
      });
      
      // Apply pace adjustment
      const currentPaceSeconds = paceToSeconds(segment.customPace);
      const adjustedPaceSeconds = Math.max(0, currentPaceSeconds + finalPaceAdjustment);
      const adjustedPace = secondsToPace(adjustedPaceSeconds);
      
      // Calculate new segment time
      const segmentTimeMinutes = adjustedPaceSeconds / 60 * segmentDistance;
      const minutes = Math.floor(segmentTimeMinutes);
      const seconds = Math.round((segmentTimeMinutes - minutes) * 60);
      const segmentTime = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
      
      console.log(`Segment "${segment.name}" pace adjustment:`, {
        'Original Pace': segment.customPace,
        'Adjusted Pace': adjustedPace,
        'New Segment Time': segmentTime
      });
      
      return {
        ...segment,
        customPace: adjustedPace,
        segmentTime
      };
    });
    
    // Calculate new total time
    const newTotalTime = calculateTotalTime(updatedSegments);
    
    // Recalibrate to maintain overall target time if needed
    if (originalTotalTime !== newTotalTime) {
      console.log("Recalibrating to maintain original target time:", {
        'Original Total': originalTotalTime,
        'New Total': newTotalTime
      });
      
      // Calculate adjustment factor
      const originalTimeInSeconds = paceToSeconds(originalTotalTime) * 60; // Convert from min/km to seconds
      const newTimeInSeconds = paceToSeconds(newTotalTime) * 60;
      const factor = originalTimeInSeconds / newTimeInSeconds;
      
      // Apply the factor to all segment paces
      const recalibratedSegments = updatedSegments.map(segment => {
        const paceInSeconds = paceToSeconds(segment.customPace);
        const recalibratedPaceSeconds = paceInSeconds * factor;
        const recalibratedPace = secondsToPace(recalibratedPaceSeconds);
        
        // Recalculate segment time
        const distanceMatch = segment.name.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
        const cleanName = segment.name.replace('km', '');
        const fallbackMatch = cleanName.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
        const match = distanceMatch || fallbackMatch;
        
        if (!match) return segment;
        
        const startDistance = parseFloat(match[1]);
        const endDistance = parseFloat(match[2]);
        const segmentDistance = endDistance - startDistance;
        
        const segmentTimeMinutes = recalibratedPaceSeconds / 60 * segmentDistance;
        const minutes = Math.floor(segmentTimeMinutes);
        const seconds = Math.round((segmentTimeMinutes - minutes) * 60);
        const segmentTime = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        
        return {
          ...segment,
          customPace: recalibratedPace,
          segmentTime
        };
      });
      
      console.log("Recalibration complete. New total time:", calculateTotalTime(recalibratedSegments));
      onUpdateSegments(recalibratedSegments);
    } else {
      onUpdateSegments(updatedSegments);
    }
    
    // Show success message
    alert("Pace plan updated based on terrain analysis and pacing strategy!");
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Calculate y-axis range for elevation chart
  const yAxisDomain = React.useMemo(() => {
    if (elevationData.length === 0) return [0, 100];
    const elevations = elevationData.map(d => d.elevation);
    const minElev = Math.floor(Math.min(...elevations));
    const maxElev = Math.ceil(Math.max(...elevations));
    const padding = Math.max(10, Math.round((maxElev - minElev) * 0.1)); // At least 10m padding or 10%
    return [Math.max(0, minElev - padding), maxElev + padding];
  }, [elevationData]);
  
  // Generate color-coded polylines for map based on segment gradient
  const generateColorCodedRoutes = () => {
    if (mapPoints.length === 0 || segmentAnalysis.length === 0) return [];
    
    // Create an array of colored path segments
    const coloredSegments: {
      points: LatLngTuple[];
      color: string;
      segmentName: string;
      gradient: number;
      elevGain: number;
      elevLoss: number;
      isUphill: boolean;
    }[] = [];
    
    // For each analyzed segment, find the matching points
    segmentAnalysis.forEach(segment => {
      const { startDist, endDist, gradient, isUphill, elevGain, elevLoss } = segment;
      
      // Find points that fall within this segment
      const segmentPoints = elevationData
        .filter(p => p.lat && p.lon && p.distance >= startDist && p.distance <= endDist)
        .map(p => [p.lat!, p.lon!] as LatLngTuple);
      
      if (segmentPoints.length > 1) {
        // Match color to the segment analysis table (red for uphill, green for downhill)
        let color = '#6B7280'; // Default gray for flat sections (gradient between -0.5 and 0.5)
        
        if (isUphill) {
          // Red colors for uphill sections with intensity based on gradient
          if (gradient > 4) {
            color = '#EF4444'; // Deep red for steep uphill
          } else if (gradient > 2) {
            color = '#F87171'; // Medium red for moderate uphill
          } else if (gradient > 0.5) {
            color = '#FCA5A5'; // Light red for gentle uphill
          }
        } else {
          // Green colors for downhill sections with intensity based on gradient
          if (gradient < -4) {
            color = '#10B981'; // Deep green for steep downhill
          } else if (gradient < -2) {
            color = '#34D399'; // Medium green for moderate downhill
          } else if (gradient < -0.5) {
            color = '#6EE7B7'; // Light green for gentle downhill
          }
        }
        
        coloredSegments.push({
          points: segmentPoints,
          color,
          segmentName: segment.segmentName,
          gradient,
          elevGain,
          elevLoss,
          isUphill
        });
      }
    });
    
    return coloredSegments;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Button 
            onClick={handleButtonClick} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            <span>Upload GPX File</span>
          </Button>
          
          {fileName && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {fileName}
            </span>
          )}
          
          <input
            type="file"
            accept=".gpx"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      
      {elevationData.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Elevation Gain</div>
                  <div className="text-2xl font-bold">{totalElevGain}m</div>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Elevation Loss</div>
                  <div className="text-2xl font-bold">{totalElevLoss}m</div>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Elevation</div>
                  <div className="text-2xl font-bold">{totalElevGain - totalElevLoss}m</div>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-bold mb-3">Elevation Profile</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={elevationData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 10,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="distance" 
                        label={{ 
                          value: 'km',
                          position: 'insideBottom',
                          offset: -5
                        }}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                      />
                      <YAxis 
                        domain={yAxisDomain}
                        label={{ 
                          value: 'Elevation (m)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { 
                            textAnchor: 'middle',
                            fontSize: isMobile ? 10 : 12 
                          }
                        }}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value} m`, 'Elevation']}
                        labelFormatter={(label) => `Distance: ${label} km`}
                      />
                      <defs>
                        <linearGradient id="colorUphill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorDownhill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      
                      {/* Draw segment boundary grid lines */}
                      {segmentAnalysis.map((segment, idx) => (
                        <ReferenceLine 
                          key={`grid-${idx}`} 
                          x={segment.startDist} 
                          stroke="#888" 
                          strokeDasharray="3 3" 
                          label={{ 
                            value: Math.round(segment.startDist).toString(), 
                            position: 'insideBottomLeft',
                            fill: '#888',
                            fontSize: 10
                          }} 
                        />
                      ))}
                      
                      {/* Color-coded elevation profile by segment */}
                      {segmentAnalysis.map((segment, idx) => {
                        // Create a filtered array of points for this segment
                        const segmentPoints = elevationData.filter(
                          point => point.distance >= segment.startDist && point.distance <= segment.endDist
                        );
                        
                        return segmentPoints.length > 0 ? (
                          <Area 
                            key={`segment-${idx}`}
                            type="monotone" 
                            dataKey="elevation" 
                            data={segmentPoints}
                            stroke={segment.isUphill ? "#ef4444" : "#22c55e"} 
                            fill={segment.isUphill ? "url(#colorUphill)" : "url(#colorDownhill)"}
                            fillOpacity={0.8}
                          />
                        ) : null;
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-bold mb-3">Course Map</h3>
                <div className="h-[350px]">
                  {mapPoints.length > 0 ? (
                    <MapContainer 
                      center={mapPoints[0]} 
                      zoom={12} 
                      scrollWheelZoom={false} 
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      
                      {/* Color-coded route segments */}
                      {segmentAnalysis.map((segment, index) => {
                        // Find points that belong to this segment
                        const segmentStartIdx = elevationData.findIndex(p => p.distance >= segment.startDist);
                        let segmentEndIdx = elevationData.findIndex(p => p.distance > segment.endDist);
                        
                        // If end index not found, use the last point
                        const actualEndIdx = segmentEndIdx === -1 ? elevationData.length - 1 : segmentEndIdx - 1;
                        
                        if (segmentStartIdx >= 0 && actualEndIdx >= segmentStartIdx) {
                          // Extract map points for this segment
                          const segmentPoints: LatLngTuple[] = [];
                          for (let i = segmentStartIdx; i <= actualEndIdx && i < mapPoints.length; i++) {
                            if (mapPoints[i] && mapPoints[i][0] && mapPoints[i][1]) {
                              segmentPoints.push(mapPoints[i]);
                            }
                          }
                          
                          if (segmentPoints.length > 1) {
                            return (
                              <React.Fragment key={index}>
                                <Polyline 
                                  positions={segmentPoints}
                                  color={segment.isUphill ? "#ef4444" : "#22c55e"}
                                  weight={4}
                                >
                                  <Popup>
                                    <div className="text-sm">
                                      <p className="font-semibold">{segment.segmentName}</p>
                                      <p>Gradient: {segment.gradient.toFixed(1)}%</p>
                                      <p>Gain: {segment.elevGain}m / Loss: {segment.elevLoss}m</p>
                                    </div>
                                  </Popup>
                                </Polyline>
                              </React.Fragment>
                            );
                          }
                        }
                        return null;
                      })}
                      
                      {/* Start marker */}
                      {mapPoints.length > 0 && (
                        <Marker position={mapPoints[0]}>
                          <Popup>Start</Popup>
                        </Marker>
                      )}
                      
                      {/* Finish marker */}
                      {mapPoints.length > 0 && (
                        <Marker position={mapPoints[mapPoints.length - 1]}>
                          <Popup>Finish</Popup>
                        </Marker>
                      )}
                      
                      <MapController points={mapPoints} />
                    </MapContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">Map data not available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {segmentAnalysis.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Segment Terrain Analysis</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Segment
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Gain (m)
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Loss (m)
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Gradient (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {segmentAnalysis.map((segment, i) => (
                      <tr key={i} className={segment.isUphill ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {segment.segmentName}
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          {segment.isUphill ? (
                            <Badge variant="destructive" className="gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="18 15 12 9 6 15"></polyline>
                              </svg>
                              Uphill
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 bg-green-500 text-white">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                              Downhill
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {segment.elevGain}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {segment.elevLoss}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {segment.gradient.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4 space-y-4">
            <div className="flex items-start gap-2">
              <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Based on terrain data, the pace will be automatically adjusted - slower for uphills, faster for downhills, while maintaining your overall target time.
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Pace Adjustment Intensity Slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Adjustment Intensity</span>
                  <span className="text-sm text-gray-500 dark:text-gray-500">{Math.round(paceAdjustmentFactor * 100)}%</span>
                </div>
                <Slider 
                  min={0} 
                  max={2} 
                  step={0.1}
                  value={[paceAdjustmentFactor]} 
                  onValueChange={(vals) => setPaceAdjustmentFactor(vals[0])}
                  className="w-full"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>None</span>
                  <span>Normal</span>
                  <span>Strong</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={applyElevationToPacePlan} className="whitespace-nowrap">
                Apply to Pace Plan
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Upload a GPX file to view elevation profile, course map, and get terrain-optimized pace recommendations
          </p>
        </div>
      )}
    </div>
  );
}
// Simple utility functions for FIT file conversion
export function convertToCsv(records: any[]) {
  const header = 'time,latitude,longitude,altitude,heart_rate,speed'
  const rows = records.map(r => [
    r.timestamp,
    r.position?.latitude || '',
    r.position?.longitude || '',
    r.altitude,
    r.heart_rate,
    r.speed
  ].join(','))
  return [header, ...rows].join('\n')
}

// This is a simplified TCX builder without using the library
export function buildTcx(records: any[]) {
  // Start TCX XML
  let tcx = '<?xml version="1.0" encoding="UTF-8"?>\n';
  tcx += '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">\n';
  tcx += '  <Activities>\n';
  tcx += '    <Activity Sport="Running">\n';
  tcx += `      <Id>${records[0]?.timestamp || new Date().toISOString()}</Id>\n`;
  tcx += '      <Lap StartTime="' + (records[0]?.timestamp || new Date().toISOString()) + '">\n';
  tcx += '        <Track>\n';
  
  // Add track points
  records.forEach(r => {
    tcx += '          <Trackpoint>\n';
    tcx += `            <Time>${r.timestamp || ''}</Time>\n`;
    
    // Add position if available
    if (r.position && r.position.latitude && r.position.longitude) {
      tcx += '            <Position>\n';
      tcx += `              <LatitudeDegrees>${r.position.latitude}</LatitudeDegrees>\n`;
      tcx += `              <LongitudeDegrees>${r.position.longitude}</LongitudeDegrees>\n`;
      tcx += '            </Position>\n';
    }
    
    // Add altitude if available
    if (r.altitude) {
      tcx += `            <AltitudeMeters>${r.altitude}</AltitudeMeters>\n`;
    }
    
    // Add heart rate if available
    if (r.heart_rate) {
      tcx += '            <HeartRateBpm>\n';
      tcx += `              <Value>${r.heart_rate}</Value>\n`;
      tcx += '            </HeartRateBpm>\n';
    }
    
    // Add distance if available
    if (r.distance) {
      tcx += `            <DistanceMeters>${r.distance}</DistanceMeters>\n`;
    }
    
    tcx += '          </Trackpoint>\n';
  });
  
  // Close TCX XML
  tcx += '        </Track>\n';
  tcx += '      </Lap>\n';
  tcx += '    </Activity>\n';
  tcx += '  </Activities>\n';
  tcx += '</TrainingCenterDatabase>';
  
  return tcx;
}

// This is a simplified GPX builder without using the library
export function buildGpx(records: any[]) {
  // Start GPX XML
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
  gpx += '<gpx version="1.1" creator="Marathon Pace Planner" xmlns="http://www.topografix.com/GPX/1/1">\n';
  gpx += '  <metadata>\n';
  gpx += `    <time>${new Date().toISOString()}</time>\n`;
  gpx += '  </metadata>\n';
  gpx += '  <trk>\n';
  gpx += '    <name>Activity</name>\n';
  gpx += '    <trkseg>\n';
  
  // Add track points
  records.forEach(r => {
    if (r.position && r.position.latitude && r.position.longitude) {
      gpx += `      <trkpt lat="${r.position.latitude}" lon="${r.position.longitude}">\n`;
      
      // Add elevation if available
      if (r.altitude) {
        gpx += `        <ele>${r.altitude}</ele>\n`;
      }
      
      // Add time if available
      if (r.timestamp) {
        gpx += `        <time>${r.timestamp}</time>\n`;
      }
      
      gpx += '      </trkpt>\n';
    }
  });
  
  // Close GPX XML
  gpx += '    </trkseg>\n';
  gpx += '  </trk>\n';
  gpx += '</gpx>';
  
  return gpx;
}
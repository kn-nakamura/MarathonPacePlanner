/**
 * シンプルなGPXパーサーの実装
 * gpxparserライブラリに問題があるため、基本的な機能だけを実装
 */

export interface Point {
  lat: number;
  lon: number;
  ele: number;
}

export interface Track {
  points: Point[];
}

export interface ParsedGPX {
  tracks: Track[];
}

export function parseGPX(gpxContent: string): ParsedGPX {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
    
    // GPXのネームスペースを対応
    const nsURI = "http://www.topografix.com/GPX/1/1";
    
    // トラックポイントを取得
    const trackPoints = Array.from(xmlDoc.getElementsByTagNameNS(nsURI, 'trkpt'));
    
    if (trackPoints.length === 0) {
      // 1.0形式も試す
      const nsURI10 = "http://www.topografix.com/GPX/1/0";
      const trackPoints10 = Array.from(xmlDoc.getElementsByTagNameNS(nsURI10, 'trkpt'));
      
      if (trackPoints10.length > 0) {
        return parseTrackPoints(trackPoints10);
      }
      
      // ネームスペースなしでも試す
      const trackPointsNoNS = Array.from(xmlDoc.getElementsByTagName('trkpt'));
      if (trackPointsNoNS.length > 0) {
        return parseTrackPoints(trackPointsNoNS);
      }
    } else {
      return parseTrackPoints(trackPoints);
    }
    
    throw new Error('GPXファイル内にトラックポイントが見つかりません');
  } catch (error) {
    console.error('GPX解析エラー:', error);
    throw new Error('GPXファイルの解析に失敗しました');
  }
}

function parseTrackPoints(trackPoints: Element[]): ParsedGPX {
  const points: Point[] = trackPoints.map(point => {
    const lat = parseFloat(point.getAttribute('lat') || '0');
    const lon = parseFloat(point.getAttribute('lon') || '0');
    
    // 標高要素を取得
    const eleElement = point.getElementsByTagName('ele')[0];
    const ele = eleElement ? parseFloat(eleElement.textContent || '0') : 0;
    
    return { lat, lon, ele };
  });
  
  return {
    tracks: [{ points }]
  };
}
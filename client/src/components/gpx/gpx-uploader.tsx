import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GPXUploaderProps {
  onGpxFileUploaded: (gpxContent: string) => void;
}

export function GPXUploader({ onGpxFileUploaded }: GPXUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError('アップロードできるのはGPXファイルのみです。');
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        onGpxFileUploaded(content);
      }
    };
    reader.onerror = () => {
      setError('ファイルの読み込み中にエラーが発生しました。');
    };
    reader.readAsText(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleButtonClick} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            <span>GPXファイルをアップロード</span>
          </Button>
          {fileName && (
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
              {fileName}
            </span>
          )}
        </div>
        
        <input
          type="file"
          accept=".gpx"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
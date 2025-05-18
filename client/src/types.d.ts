// Type declarations for libraries without TypeScript definitions

declare module 'fit-file-parser' {
  export class FitParser {
    constructor(options?: {
      mode?: string;
      lengthUnit?: string;
      speedUnit?: string;
      forceDownload?: boolean;
    });
    
    parse(content: ArrayBuffer, callback: (error: Error | null, data: any) => void): void;
  }
}

declare module 'file-saver' {
  export function saveAs(data: Blob | File | string, filename?: string, options?: {
    autoBom?: boolean;
  }): void;
}
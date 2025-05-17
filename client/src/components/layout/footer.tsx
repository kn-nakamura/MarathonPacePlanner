import { Link } from 'wouter';
import { Instagram } from 'lucide-react';
import { BMCButton } from '../BMCButton';

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Buy Me a Coffee ボタン */}
        <BMCButton />
        
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start space-x-6">
            <a 
              href="https://www.instagram.com/kenta.frun?igsh=ZGpzanE5ZHU0cXAx&utm_source=qr" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-500"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a 
              href="https://www.threads.com/@kenta.frun?igshid=NTc4MTIwNjQ2YQ==" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-500"
              aria-label="Threads"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 48 48" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="h-5 w-5"
              >
                <path d="M24,0 C10.75,0 0,10.75 0,24 C0,37.25 10.75,48 24,48 C37.25,48 48,37.25 48,24 C48,10.75 37.25,0 24,0 Z M24,36 C17.38,36 12,30.62 12,24 C12,17.38 17.38,12 24,12 C30.62,12 36,17.38 36,24 C36,30.62 30.62,36 24,36 Z M36,24 C36,17.38 30.62,12 24,12" />
              </svg>
            </a>
          </div>
          <p className="mt-8 text-center md:mt-0 text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Marathon Pace Planner. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

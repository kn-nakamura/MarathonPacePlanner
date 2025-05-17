import { Link } from 'wouter';
import { Facebook, Instagram, Twitter, Github } from 'lucide-react';
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
              href="#" 
              className="text-gray-400 hover:text-gray-500"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="#" 
              className="text-gray-400 hover:text-gray-500"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a 
              href="#" 
              className="text-gray-400 hover:text-gray-500"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="#" 
              className="text-gray-400 hover:text-gray-500"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
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

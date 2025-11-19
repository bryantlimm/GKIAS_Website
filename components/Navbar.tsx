// components/Navbar.tsx
'use client'; 

import Link from 'next/link';
import Image from 'next/image';
import React, { useState } from 'react';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'About Us', href: '/about-us' },
  { name: 'News', href: '/news' },
  { name: 'Kebaktian', href: '/kebaktian' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // Set fixed position and DARK background
    <nav className="fixed w-full bg-blue-900 shadow-xl z-50"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo (Left Side - Desktop) */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image 
                src="/main_logo.png" 
                alt="GKIAS Logo" 
                width={100} 
                height={100} 
              />
              {/* Removed "GKI Alam Sutera" text for a cleaner dark header */}
            </Link>
          </div>

          {/* Desktop Links (Right Side) */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                // Text color is WHITE, hover uses a lighter background
                className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition duration-150" 
              >
                {link.name}
              </Link>
            ))}
            {/* Admin Sign In Button */}
            <Link
              href="/admin/login"
              className="bg-blue-600 text-white hover:bg-blue-500 px-3 py-2 rounded-md text-sm font-medium ml-4"
            >
              Admin Sign In
            </Link>
          </div>

          {/* Mobile View: Hamburger Menu (Left) and Logo (Right) */}
          <div className="flex items-center sm:hidden">
             {/* Hamburger Button (Left) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* <Link href="/" className="flex items-center ml-auto">
              <Image 
                src="/main_logo.png" 
                alt="GKIAS Logo" 
                width={32} 
                height={32} 
              />
            </Link> */}
          </div>
        </div>
      </div>

      {/* Mobile Menu Content (Slides open) - Dark background and white text */}
      {isOpen && (
        <div className="sm:hidden absolute w-full bg-blue-800 shadow-lg border-t border-blue-700 pb-2">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium transition duration-150"
              >
                {link.name}
              </Link>
            ))}
            {/* Admin Sign In for Mobile */}
            <Link
              href="/admin/login"
              onClick={() => setIsOpen(false)}
              className="bg-blue-600 text-white hover:bg-blue-500 block w-full text-center px-3 py-2 mt-2 rounded-md text-base font-medium"
            >
              Admin Sign In
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
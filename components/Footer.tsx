// components/Footer.tsx
import Link from 'next/link';
import Image from 'next/image';

const socialLinks = [
  { 
    name: 'Instagram', 
    href: 'https://www.instagram.com/gkibjalsut/', 
    iconSrc: '/instagram.png', // Uses the image from public/
  },
  { 
    name: 'YouTube', 
    href: 'https://www.youtube.com/@gkibungurbakaljemaatalamsu6315', 
    iconSrc: '/youtube.png', // Uses the image from public/
  },
];

export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white mt-10">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Column 1: Logo (150x150, full display, no text) */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-4">
              <Image 
                src="/main_logo.png"
                alt="GKIAS Logo" 
                width={150} 
                height={150} 
                className="mr-3 rounded-full"
              />
              {/* <span className="text-xl font-bold">GKI Alam Sutera</span> */}
            </div>
            <p className="text-sm text-blue-200">
              Melayani dan menjadi berkat bagi sesama.
            </p>
          </div>

          {/* Column 2: Contact Us */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-blue-700 pb-1">Contact Us</h3>
            <p className="text-sm text-blue-200 mb-2">
              <span className="font-medium text-white">Call/WA:</span> +62-812-9059-3338
            </p>
            <p className="text-sm text-blue-200">
              <span className="font-medium text-white">Email:</span> gki.bjalamsutera@gmail.com
            </p>
          </div>

          {/* Column 3: Alamat Gereja */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg font-semibold mb-3 border-b border-blue-700 pb-1">Alamat Gereja</h3>
            <p className="text-sm text-blue-200">
              Alam Sutera, Jl. Jalur Sutera KAV 26 A, Ruko Palmyra Square No.10 - 11, Kunciran, Pinang, Tangerang City, Banten 15320
            </p>
          </div>

          {/* Column 4: Follow Us (Social Media) */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-blue-700 pb-1">Follow Us</h3>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                 <Link key={social.name} href={social.href} target="_blank" aria-label={social.name}>
                    <Image 
                      src={social.iconSrc}
                      alt={`${social.name} Icon`}
                      width={32} // Adjusted icon size
                      height={32} // Adjusted icon size
                      className="transition duration-300 hover:scale-105"
                    />
                 </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright and Bottom Text */}
        <div className="mt-12 border-t border-blue-800 pt-8 text-center">
          <p className="text-sm text-blue-300">&copy; {new Date().getFullYear()} GKI Bungur Bakal Jemaat Alam Sutera. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
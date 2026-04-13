// app/privacypolicy/page.tsx
'use client';

import { useState } from 'react';

interface Subsection {
  label?: string;
  text: string;
  linkType?: 'email' | 'whatsapp';
  linkValue?: string;
  linkText?: string;
  afterLink?: string;
  showAsLink?: boolean;
  isPlainText?: boolean;
}

interface Section {
  title: string;
  content?: string;
  subsections?: Subsection[];
  hasLink?: boolean;
  linkText?: string;
  linkType?: 'email' | 'whatsapp';
  linkValue?: string;
}

interface ContentLanguage {
  title: string;
  description: string;
  sections: Section[];
}

export default function PrivacyPolicy() {
  const [language, setLanguage] = useState<'en' | 'id'>('en');

  const content: Record<'en' | 'id', ContentLanguage> = {
    en: {
      title: 'Privacy Policy',
      description: 'GKI Alam Sutera App Privacy Policy',
      sections: [
        {
          title: 'Welcome to the GKI Alam Sutera App',
          content: 'We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data when you use our mobile application.'
        },
        {
          title: '1. Information We Collect',
          content: 'When you use our app, we collect personal information that you voluntarily provide to us when you register for an account, request a volunteer role, or register for events. This includes:',
          subsections: [
            { label: 'Account Data:', text: 'Name, email address, and password.' },
            { label: 'Profile Data:', text: 'Your assigned roles (e.g., Jemaat, Volunteer, Admin) and ministry preferences.' },
            { label: 'Activity Data:', text: 'Volunteer service assignments, acceptance/rejection statuses, attendance counts, and offering inputs submitted during services.' },
            { label: 'Device Data:', text: 'We may collect device tokens specifically to send you push notifications regarding your schedules and church bulletins.' }
          ]
        },
        {
          title: '2. How We Use Your Information',
          content: 'We use your data solely for the internal operations of the church, specifically to facilitate account creation and church database.'
        },
        {
          title: '3. Sharing and Securing Your Information',
          content: 'We do not sell, rent, or trade your personal information to third parties. Your data is stored securely on our database (Firebase) and is only accessible to authorized GKI Alam Sutera staff and administrators for the purpose of managing church operations and database. We take reasonable measures to protect your data from unauthorized access, use, or disclosure.'
        },
        {
          title: '4. Your Data Rights, Retention, and Deletion',
          content: 'We keep your personal information for as long as it is necessary for the purposes set out in this Privacy Policy.',
          subsections: [
            {
              label: 'Your Right to Access and Update:',
              text: 'You have the right to view and change your personal data (such as your name, email, and password) directly within the App settings.',
              isPlainText: true
            },
            {
              label: 'Your Right to Delete:',
              text: 'You have the right to request the deletion of your account and personal data. You can initiate this request directly within the App settings or by contacting us at ',
              linkText: 'gkialamsutera@gmail.com',
              linkType: 'email',
              linkValue: 'gkialamsutera@gmail.com',
              afterLink: ' or through WhatsApp '
            },
            {
              label: '',
              text: '+62-812-9059-3338',
              linkType: 'whatsapp',
              linkValue: '+62-812-9059-3338',
              showAsLink: true
            },
            {
              label: '',
              text: 'Upon request, we will securely delete your account credentials and personal identifying information from our active databases.',
              isPlainText: true
            }
          ]
        },
        {
          title: '5. Age Restriction',
          content: 'This app is designed for users who are 12 years of age or older. We do not knowingly collect personal information from anyone under the age of 12.'
        },
        {
          title: '6. Updates to this Policy',
          content: 'We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any significant changes via the App.'
        },
        {
          title: '7. Contact Us',
          content: 'If you have questions or comments about this policy, you may email us at: ',
          hasLink: true,
          linkText: 'gkialamsutera@gmail.com',
          linkType: 'email',
          linkValue: 'gkialamsutera@gmail.com'
        }
      ]
    },
    id: {
      title: 'Kebijakan Privasi',
      description: 'Kebijakan Privasi Aplikasi GKI Alam Sutera',
      sections: [
        {
          title: 'Selamat datang di Aplikasi GKI Alam Sutera',
          content: 'Kami berkomitmen untuk melindungi informasi pribadi Anda dan hak privasi Anda. Kebijakan Privasi ini menjelaskan informasi apa saja yang kami kumpulkan, bagaimana kami menggunakannya, serta hak Anda terkait data Anda saat menggunakan aplikasi mobile kami.'
        },
        {
          title: '1. Informasi yang Kami Kumpulkan',
          content: 'Saat Anda menggunakan aplikasi kami, kami mengumpulkan informasi pribadi yang Anda berikan secara sukarela ketika Anda mendaftar akun, mengajukan diri sebagai volunteer, atau mendaftar acara. Informasi tersebut meliputi:',
          subsections: [
            { label: 'Data Akun:', text: 'Nama, alamat email, dan kata sandi.' },
            { label: 'Data Profil:', text: 'Peran Anda (misalnya Jemaat, Volunteer, Admin) serta preferensi pelayanan.' },
            { label: 'Data Aktivitas:', text: 'Penugasan pelayanan volunteer, status penerimaan/penolakan, jumlah kehadiran, serta input persembahan yang dikirimkan selama ibadah.' },
            { label: 'Data Perangkat:', text: 'Kami dapat mengumpulkan token perangkat untuk mengirimkan notifikasi (push notification) terkait jadwal dan warta gereja.' }
          ]
        },
        {
          title: '2. Bagaimana Kami Menggunakan Informasi Anda',
          content: 'Kami menggunakan data Anda semata-mata untuk keperluan operasional internal gereja, khususnya untuk memfasilitasi pembuatan akun dan pengelolaan database jemaat.'
        },
        {
          title: '3. Pembagian dan Keamanan Informasi Anda',
          content: 'Kami tidak menjual, menyewakan, atau memperdagangkan informasi pribadi Anda kepada pihak ketiga. Data Anda disimpan secara aman dalam database kami (Firebase) dan hanya dapat diakses oleh staf dan administrator GKI Alam Sutera yang berwenang untuk keperluan pengelolaan operasional gereja dan database. Kami mengambil langkah-langkah yang wajar untuk melindungi data Anda dari akses, penggunaan, atau pengungkapan yang tidak sah.'
        },
        {
          title: '4. Hak Data Anda, Penyimpanan, dan Penghapusan Akun',
          content: 'Kami menyimpan informasi pribadi Anda selama diperlukan untuk tujuan yang dijelaskan dalam Kebijakan Privasi ini.',
          subsections: [
            {
              label: 'Hak Anda untuk Mengakses dan Memperbarui:',
              text: 'Anda berhak untuk melihat dan mengubah data pribadi Anda (seperti nama, email, dan kata sandi) secara langsung melalui pengaturan Aplikasi.',
              isPlainText: true
            },
            {
              label: 'Hak Anda untuk Menghapus Data:',
              text: 'Anda memiliki hak untuk meminta penghapusan akun dan data pribadi Anda. Permintaan ini dapat dilakukan langsung melalui pengaturan aplikasi atau dengan menghubungi kami melalui email di '
            },
            {
              label: '',
              text: 'gkialamsutera@gmail.com',
              linkType: 'email',
              linkValue: 'gkialamsutera@gmail.com',
              showAsLink: true,
              afterLink: ' atau WhatsApp di '
            },
            {
              label: '',
              text: '+62-812-9059-3338',
              linkType: 'whatsapp',
              linkValue: '+62-812-9059-3338',
              showAsLink: true,
              afterLink: '.'
            },
            {
              label: '',
              text: 'Setelah permintaan diterima, kami akan menghapus kredensial akun dan informasi identitas pribadi Anda secara aman dari database aktif kami.',
              isPlainText: true
            }
          ]
        },
        {
          title: '5. Batasan Usia',
          content: 'Aplikasi ini dirancang untuk pengguna berusia 12 tahun ke atas. Kami tidak secara sengaja mengumpulkan informasi pribadi dari anak-anak di bawah usia 12 tahun.'
        },
        {
          title: '6. Perubahan Kebijakan',
          content: 'Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu untuk menyesuaikan dengan perubahan praktik atau ketentuan hukum. Kami akan memberitahukan perubahan yang signifikan melalui aplikasi.'
        },
        {
          title: '7. Hubungi Kami',
          content: 'Jika Anda memiliki pertanyaan atau komentar mengenai kebijakan ini, silakan hubungi kami melalui email: ',
          hasLink: true,
          linkText: 'gkialamsutera@gmail.com',
          linkType: 'email',
          linkValue: 'gkialamsutera@gmail.com'
        }
      ]
    }
  };

  const currentContent = content[language];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                {currentContent.title}
              </h1>
              <p className="text-gray-600 mt-2">{currentContent.description}</p>
            </div>
            
            {/* Sliding Language Toggle */}
            <div 
              className="relative flex items-center w-28 h-10 bg-gray-200 rounded-full p-1 cursor-pointer select-none"
              onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
            >
              <div 
                className={`absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-full transition-transform duration-300 ease-in-out ${
                  language === 'id' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'
                }`}
              />
              <div className={`flex-1 text-center text-sm font-semibold z-10 transition-colors duration-300 ${language === 'en' ? 'text-white' : 'text-gray-600'}`}>
                EN
              </div>
              <div className={`flex-1 text-center text-sm font-semibold z-10 transition-colors duration-300 ${language === 'id' ? 'text-white' : 'text-gray-600'}`}>
                ID
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 space-y-8">
          {currentContent.sections.map((section, index) => (
            <div key={index} className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {section.title}
              </h2>

              {section.content && !section.hasLink && (
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                  {section.content}
                </p>
              )}

              {section.hasLink && (
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                  {section.content}
                  <a
                    href={`${section.linkType === 'email' ? 'mailto:' : 'https://wa.me/'}${section.linkValue}`}
                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                    target={section.linkType === 'whatsapp' ? '_blank' : undefined}
                    rel={section.linkType === 'whatsapp' ? 'noopener noreferrer' : undefined}
                  >
                    {section.linkText}
                  </a>
                </p>
              )}

              {section.subsections && section.subsections.length > 0 && (
                <div className="ml-4 sm:ml-6 space-y-3">
                  {section.subsections.map((subsection, subIndex) => (
                    <div key={subIndex} className="text-gray-700 leading-relaxed text-sm sm:text-base">
                      {subsection.label && (
                        <span className="font-semibold block sm:inline sm:mr-1">{subsection.label}</span>
                      )}
                      {subsection.isPlainText ? (
                        <span className="mt-1 sm:mt-0">{subsection.text}</span>
                      ) : subsection.showAsLink ? (
                        <span className="mt-1 sm:mt-0">
                          {subsection.text && !subsection.linkType && subsection.text}
                          {subsection.linkType && (
                            <>
                              <a
                                href={`${subsection.linkType === 'email' ? 'mailto:' : 'https://wa.me/'}${subsection.linkValue}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                target={subsection.linkType === 'whatsapp' ? '_blank' : undefined}
                                rel={subsection.linkType === 'whatsapp' ? 'noopener noreferrer' : undefined}
                              >
                                {subsection.text}
                              </a>
                              {subsection.afterLink && <span>{subsection.afterLink}</span>}
                            </>
                          )}
                        </span>
                      ) : (
                        <span>
                          {subsection.text}
                          {subsection.linkType && (
                            <>
                              <a
                                href={`${subsection.linkType === 'email' ? 'mailto:' : 'https://wa.me/'}${subsection.linkValue}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                target={subsection.linkType === 'whatsapp' ? '_blank' : undefined}
                                rel={subsection.linkType === 'whatsapp' ? 'noopener noreferrer' : undefined}
                              >
                                {subsection.linkText}
                              </a>
                              {subsection.afterLink && <span>{subsection.afterLink}</span>}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-gray-600 text-sm sm:text-base">
          <p>Last updated: April 13, 2026</p>
        </div>
      </div>
    </div>
  );
}
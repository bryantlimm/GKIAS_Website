// components/home/VisiMisi.tsx
interface VisiMisiProps {
  visi: string;
  misi: string;
}

export default function VisiMisi({ visi, misi }: VisiMisiProps) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Visi */}
          <div>
            <h2 className="text-4xl font-extrabold text-blue-900 mb-4 border-l-4 border-blue-600 pl-4">Visi</h2>
            <p className="text-lg text-gray-700 leading-relaxed">{visi}</p>
          </div>

          {/* Misi */}
          <div>
            <h2 className="text-4xl font-extrabold text-blue-900 mb-4 border-l-4 border-blue-600 pl-4">Misi</h2>
            <p className="text-lg text-gray-700 leading-relaxed">{misi}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
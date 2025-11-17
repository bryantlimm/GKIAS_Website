// app/page.tsx
export default function Home() {
  return (
    <main>
      {/* This will be the content area below the Navbar */}
      <div className="pt-20 text-center">
        <h1 className="text-3xl font-bold">Welcome Home!</h1>
        <p className="text-gray-600">Navbar and Footer will wrap this content.</p>
      </div>
    </main>
  );
}
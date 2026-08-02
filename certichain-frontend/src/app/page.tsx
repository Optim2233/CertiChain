async function getBackendMessage() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/`, {
      cache: "no-store",
    });
    return res.ok ? await res.text() : `Backend responded with ${res.status}`;
  } catch {
    return "Could not reach backend";
  }
}

export default async function Home() {
  const backendMessage = await getBackendMessage();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-4 py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          CertiChain
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Backend says: {backendMessage}
        </p>
      </main>
    </div>
  );
}

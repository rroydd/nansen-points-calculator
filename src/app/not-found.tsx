import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: "4rem", fontFamily: "sans-serif" }}>
      <h1>Page not found</h1>
      <Link href="/">Return to calculator</Link>
    </main>
  );
}

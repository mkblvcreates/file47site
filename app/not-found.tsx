import Link from 'next/link';
import './not-found.css';

/**
 * FILE47's own 404.
 *
 * The OS's says "ROUTE NOT FOUND / RETURN TO SHELL" and links into
 * `/os/dashboard`, which on a client's domain is a dead end into somebody
 * else's product. This one is in FILE47's register and its only exit is home.
 */
export default function NotFound() {
  return (
    <main className="nf">
      <p className="nf-code">404</p>
      <p className="nf-line">NO SIGNAL ON THIS CHANNEL</p>
      <Link href="/" className="nf-back">
        ← FILE47
      </Link>
    </main>
  );
}

import { createContext, useContext, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from './api.js';
import Home from './pages/Home.jsx';
import Seats from './pages/Seats.jsx';
import Tickets from './pages/Tickets.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';

const Auth = createContext();
export const useAuth = () => useContext(Auth);

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-white">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect x="2" y="6" width="26" height="15" rx="4" fill="#fff" />
        <rect x="5" y="9" width="6" height="5" rx="1" fill="#2b6777" />
        <rect x="13" y="9" width="6" height="5" rx="1" fill="#2b6777" />
        <rect x="21" y="9" width="5" height="5" rx="1" fill="#52ab98" />
        <circle cx="9" cy="22" r="3" fill="#52ab98" />
        <circle cx="21" cy="22" r="3" fill="#52ab98" />
      </svg>
      <span className="font-head text-xl font-extrabold tracking-tight">Luit Express</span>
    </Link>
  );
}

export default function App() {
  const [user, setUser] = useState(getUser());
  const nav = useNavigate();
  const logout = () => { clearSession(); setUser(null); nav('/'); };

  return (
    <Auth.Provider value={{ user, setUser }}>
      <header className="bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-5 text-sm font-semibold text-white">
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-leaf text-white font-bold' : 'hover:bg-white/10'
                  }`
                }
              >
                Admin Panel
              </NavLink>
            )}
            {user && <NavLink to="/tickets" className="hover:underline">My tickets</NavLink>}
            {user ? (
              <button onClick={logout} className="hover:underline">Log out</button>
            ) : (
              <NavLink to="/login" className="rounded-md bg-white px-3 py-1.5 text-ink">Log in</NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trip/:id" element={<Seats />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer className="border-t-2 border-mist py-6 text-center text-sm">
        Luit Express &middot; Guwahati, Assam &middot; college project, payments are simulated
      </footer>
    </Auth.Provider>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

interface LinkItem {
  id: string;
  short_code: string;
  short_url: string;
  original_url: string;
  total_clicks: number;
  created_at: string;
}

export default function DashboardPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newUrl, setNewUrl] = useState('');
  const [shortening, setShortening] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/links');
      setLinks(response.data.data);
    } catch (error) {
      console.error('Błąd podczas pobierania linków:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    try {
      setShortening(true);
      const response = await api.post('/api/links', { original_url: newUrl });
      // Dodaj nowy link na początek listy
      setLinks((prev) => [response.data, ...prev]);
      setNewUrl('');
    } catch (error) {
      console.error('Błąd podczas skracania linku:', error);
      alert('Nie udało się skrócić linku. Upewnij się, że URL jest poprawny.');
    } finally {
      setShortening(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Twoje Linki</h1>
        <button onClick={handleLogout} className="logout-btn">Wyloguj się</button>
      </header>

      <div className="shortener-card">
        <h2>Skróć nowy URL</h2>
        <form className="shortener-form" onSubmit={handleShorten}>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://twoja-dluga-strona.pl/bardzo/dlugi/link"
            className="shortener-input"
            required
          />
          <button type="submit" disabled={shortening || !newUrl} className="shortener-btn">
            {shortening ? 'Skracanie...' : 'Skróć'}
          </button>
        </form>
      </div>

      <div className="links-table-container">
        {loading ? (
          <div className="empty-state">Ładowanie linków...</div>
        ) : links.length === 0 ? (
          <div className="empty-state">Nie masz jeszcze żadnych linków. Skróć swój pierwszy link powyżej!</div>
        ) : (
          <table className="links-table">
            <thead>
              <tr>
                <th>Krótki link</th>
                <th>Oryginalny URL</th>
                <th>Kliknięcia</th>
                <th>Utworzono</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id}>
                  <td>
                    <a href={link.short_url} target="_blank" rel="noopener noreferrer" className="link-short">
                      {link.short_url}
                    </a>
                  </td>
                  <td>
                    <span className="link-original" title={link.original_url}>
                      {link.original_url}
                    </span>
                  </td>
                  <td>{link.total_clicks}</td>
                  <td>{new Date(link.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/analytics/${link.id}`} className="action-btn">
                      Analizuj
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

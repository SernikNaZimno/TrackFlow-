import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import './AnalyticsPage.css';

interface LinkDetails {
  id: string;
  short_code: string;
  short_url: string;
  original_url: string;
  created_at: string;
}

interface StatsData {
  total_clicks: number;
  unique_clicks: number;
  clicks_over_time: { timestamp: string; count: number }[];
  by_device: { device_type: string; count: number }[];
  by_country: { country: string; count: number }[];
  by_referrer: { referrer: string; count: number }[];
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [linkDetails, setLinkDetails] = useState<LinkDetails | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [linkRes, statsRes] = await Promise.all([
        api.get(`/api/links/${id}`),
        api.get(`/api/links/${id}/stats`)
      ]);
      setLinkDetails(linkRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('Błąd podczas pobierania analityki:', err);
      setError('Nie udało się pobrać danych analitycznych. Być może nie masz uprawnień do tego linku.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Ładowanie statystyk...</div>;
  }

  if (error || !linkDetails || !stats) {
    return (
      <div className="error-state">
        <p>{error || 'Nie znaleziono linku'}</p>
        <Link to="/" className="back-btn">← Wróć do panelu</Link>
      </div>
    );
  }

  // Formatowanie danych do wykresu
  const chartData = stats.clicks_over_time.map(item => ({
    date: format(parseISO(item.timestamp), 'd MMM', { locale: pl }),
    count: item.count
  }));

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <h1>Analityka</h1>
        <Link to="/" className="back-btn">← Wróć do panelu</Link>
      </header>

      <div className="link-details-card">
        <h2>Szczegóły Linku</h2>
        <p><strong>Krótki URL:</strong> <a href={linkDetails.short_url} target="_blank" rel="noopener noreferrer">{linkDetails.short_url}</a></p>
        <p><strong>Oryginalny URL:</strong> <a href={linkDetails.original_url} target="_blank" rel="noopener noreferrer">{linkDetails.original_url}</a></p>
        <p><strong>Utworzono:</strong> {new Date(linkDetails.created_at).toLocaleString()}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_clicks}</div>
          <div className="stat-label">Wszystkie Kliknięcia</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.unique_clicks}</div>
          <div className="stat-label">Unikalne (IP)</div>
        </div>
      </div>

      <div className="chart-section">
        <h3>Kliknięcia w czasie (ostatnie 7 dni)</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text)" tick={{fill: 'var(--text)'}} />
              <YAxis stroke="var(--text)" tick={{fill: 'var(--text)'}} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-h)' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Area type="monotone" dataKey="count" name="Kliknięcia" stroke="var(--accent)" fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="breakdown-grid">
        <div className="breakdown-card">
          <h3>Urządzenia</h3>
          {stats.by_device.length === 0 ? <p>Brak danych</p> : (
            <ul className="breakdown-list">
              {stats.by_device.map((item, idx) => (
                <li key={idx} className="breakdown-item">
                  <span className="breakdown-label">{item.device_type}</span>
                  <span className="breakdown-count">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="breakdown-card">
          <h3>Kraje</h3>
          {stats.by_country.length === 0 ? <p>Brak danych</p> : (
            <ul className="breakdown-list">
              {stats.by_country.map((item, idx) => (
                <li key={idx} className="breakdown-item">
                  <span className="breakdown-label">{item.country || 'Nieznany'}</span>
                  <span className="breakdown-count">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="breakdown-card">
          <h3>Źródła (Referrers)</h3>
          {stats.by_referrer.length === 0 ? <p>Brak danych</p> : (
            <ul className="breakdown-list">
              {stats.by_referrer.map((item, idx) => (
                <li key={idx} className="breakdown-item">
                  <span className="breakdown-label">{item.referrer}</span>
                  <span className="breakdown-count">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Wywołanie do backendu (Fastify)
      const response = await api.post('/auth/login', { email, password });
      
      // Zapisanie tokena
      localStorage.setItem('token', response.data.token);
      
      // Aktualizacja kontekstu (wywoła przekierowanie w App.tsx)
      setUser({ token: response.data.token });
      navigate('/');
    } catch (error) {
      alert('Logowanie nieudane. Sprawdź dane.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Logowanie TrackFlow</h1>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label><br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>Hasło:</label><br />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" style={{ marginTop: '20px' }}>Zaloguj się</button>
      </form>
    </div>
  );
}
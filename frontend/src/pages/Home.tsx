import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <section className="hero-section">
        <h1>Bienvenido al Gestor de Notas</h1>
        <p className="subtitle">Tu espacio personal para organizar tus ideas</p>
        <button 
          className="cta-button"
          onClick={() => navigate('/notes')}
        >
          Comenzar ahora
        </button>
      </section>

      <section className="features-section">
        <h2>Características principales</h2>
        <div className="features-grid">
          <div className="feature-card">
            <i className="fas fa-lock"></i>
            <h3>Seguro</h3>
            <p>Tus notas están protegidas y solo tú puedes acceder a ellas</p>
          </div>

          <div className="feature-card">
            <i className="fas fa-sync"></i>
            <h3>Sincronizado</h3>
            <p>Accede a tus notas desde cualquier dispositivo</p>
          </div>

          <div className="feature-card">
            <i className="fas fa-palette"></i>
            <h3>Personalizable</h3>
            <p>Organiza tus notas como prefieras</p>
          </div>

          <div className="feature-card">
            <i className="fas fa-share-alt"></i>
            <h3>Compartible</h3>
            <p>Comparte notas con quien tú elijas</p>
          </div>
        </div>
      </section>

      <section className="get-started-section">
        <h2>¿Listo para empezar?</h2>
        <p>Únete a miles de usuarios que ya organizan sus ideas con nosotros</p>
        <div className="action-buttons">
          <button 
            className="primary-button"
            onClick={() => navigate('/login')}
          >
            Iniciar Sesión
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;

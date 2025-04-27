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

      <section className="testimonials-section">
        <h2>Lo que dicen nuestros usuarios</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p className="testimonial-text">"Una herramienta perfecta para organizar mis ideas, proyectos, tareas y con la posibilidad de trabajar con compañeros."</p>
            <p className="testimonial-author">Juan José Muñoz</p>
            <p className="testimonial-company">Coautor de esta página y usuario.</p>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">"AQUI RODRIGO TIENE QUE PONER SU OPINIÓN"</p>
            <p className="testimonial-author">Rodrigo Aparisi</p>
            <p className="testimonial-company">Coautor de esta página y usuario.</p>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <h2>¿Necesitas más información?</h2>
        <div className="contact-container">
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="name">Nombre</label>
              <input type="text" id="name" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="message">Mensaje</label>
              <textarea id="message" rows={4} required></textarea>
            </div>
            <button type="submit" className="submit-button">Enviar Mensaje</button>
          </form>
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

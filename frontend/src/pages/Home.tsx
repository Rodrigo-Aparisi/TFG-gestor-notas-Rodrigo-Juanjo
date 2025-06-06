import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';
import config from "../config/config";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  // Estado para controlar el carrusel de testimonios
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  
  // Refs para animaciones
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const getStartedRef = useRef<HTMLDivElement>(null);
  
  // Testimonios como datos estructurados
  const testimonials = [
    {
      id: 1,
      text: "Una herramienta perfecta para organizar mis ideas, proyectos, tareas y con la posibilidad de trabajar con compañeros.",
      author: "Juan José Muñoz",
      role: "Coautor de esta página y usuario."
    },
    {
      id: 2,
      text: "La mejor aplicación para mantener organizados todos mis proyectos. La interfaz es intuitiva y el sistema de recordatorios es excepcional.",
      author: "Rodrigo Aparisi",
      role: "Coautor de esta página y usuario."
    }
  ];
  
  // Efecto para detectar elementos visibles y animarlos con threshold mejorado
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -100px 0px' });
    
    const sections = [
      heroRef.current, 
      featuresRef.current, 
      testimonialsRef.current, 
      contactRef.current,
      getStartedRef.current
    ];
    
    sections.forEach(section => {
      if (section) observer.observe(section);
    });
    
    return () => {
      sections.forEach(section => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);
  
  // Auto-rotación de testimonios con pausa al hover
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    
    const pauseRotation = () => clearInterval(interval);
    const resumeRotation = () => {};  // La rotación se reanudará cuando se cree un nuevo intervalo
    
    testimonialCards.forEach(card => {
      card.addEventListener('mouseenter', pauseRotation);
      card.addEventListener('mouseleave', resumeRotation);
    });
    
    return () => {
      clearInterval(interval);
      testimonialCards.forEach(card => {
        card.removeEventListener('mouseenter', pauseRotation);
        card.removeEventListener('mouseleave', resumeRotation);
      });
    };
  }, [testimonials.length]);
  
  // Manejar envío del formulario de contacto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${config.API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          message
        }),
      });
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const data = await response.json();
        
        if (response.ok) {
          setSubmitMessage({ 
            type: 'success', 
            text: '¡Mensaje enviado correctamente! Nos pondremos en contacto contigo pronto.' 
          });
          setName('');
          setEmail('');
          setMessage('');
        } else {
          throw new Error(data.message || 'Error en el servidor');
        }
      } else {
        const text = await response.text();
        console.error('Respuesta no JSON:', text);
        throw new Error('El servidor no respondió con formato JSON válido');
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Hubo un problema al enviar el mensaje. Por favor, inténtalo de nuevo.' 
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSubmitMessage({ type: '', text: '' });
      }, 5000);
    }
  };

  // Navegación suave a secciones
  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-container">
      {/* Hero Section con animación */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-content">
          <h1 className="hero-title">Tu espacio para organizar ideas</h1>
          <p className="hero-subtitle">Captura, organiza y comparte notas de forma rápida y sencilla</p>
          <div className="hero-buttons">
            <button 
              className="cta-button primary-button"
              onClick={() => navigate('/notes')}
              aria-label="Comenzar a usar la aplicación"
            >
              Comenzar ahora
            </button>
            <button 
              className="cta-button secondary-button"
              onClick={() => scrollToSection(contactRef)}
              aria-label="Más información sobre la aplicación"
            >
              Saber más
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="floating-note note-1">
            <i className="fas fa-sticky-note" aria-hidden="true"></i>
            <span>Ideas</span>
          </div>
          <div className="floating-note note-2">
            <i className="fas fa-tasks" aria-hidden="true"></i>
            <span>Tareas</span>
          </div>
          <div className="floating-note note-3">
            <i className="fas fa-calendar" aria-hidden="true"></i>
            <span>Eventos</span>
          </div>
        </div>
      </section>

      {/* Features Section con animación */}
      <section className="features-section" ref={featuresRef}>
        <h2 className="section-title">Características principales</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-lock" aria-hidden="true"></i>
            </div>
            <h3>Seguro</h3>
            <p>Tus notas están protegidas y solo tú puedes acceder a ellas</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-sync" aria-hidden="true"></i>
            </div>
            <h3>Sincronizado</h3>
            <p>Accede a tus notas desde cualquier dispositivo</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-palette" aria-hidden="true"></i>
            </div>
            <h3>Personalizable</h3>
            <p>Organiza tus notas como prefieras</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-share-alt" aria-hidden="true"></i>
            </div>
            <h3>Compartible</h3>
            <p>Comparte notas con quien tú elijas</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section con animación y controles */}
      <section className="testimonials-section" ref={testimonialsRef}>
        <h2 className="section-title">Lo que dicen nuestros usuarios</h2>
        <div className="testimonials-carousel">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.id}
              className={`testimonial-card ${index === activeTestimonial ? 'active' : ''}`}
            >
              <div className="testimonial-rating">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className="fas fa-star" aria-hidden="true"></i>
                ))}
              </div>
              <p className="testimonial-text">{testimonial.text}</p>
              <div className="testimonial-author-container">
                <div className="testimonial-avatar">
                  <i className="fas fa-user-circle" aria-hidden="true"></i>
                </div>
                <div className="testimonial-author-info">
                  <p className="testimonial-author">{testimonial.author}</p>
                  <p className="testimonial-company">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </section>

      {/* Contact Section con animación */}
      <section className="contact-section" ref={contactRef}>
        <h2 className="section-title">Contáctanos</h2>
        <div className="contact-container">
          <div className="contact-info">
            <h3>¿Tienes alguna pregunta?</h3>
            <p>Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.</p>
            <div className="contact-methods">
              <div className="contact-method">
                <i className="fas fa-envelope" aria-hidden="true"></i>
                <span>olympus.scribe@gmail.com</span>
              </div>
              {/*}
              <div className="contact-method">
                <i className="fas fa-phone" aria-hidden="true"></i>
                <span>+34 912 345 678</span>
              </div>
              */}
              <div className="contact-method">
                <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
                <span>Madrid, España</span>
              </div>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Nombre</label>
              <input 
                type="text" 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Mensaje</label>
              <textarea 
                id="message" 
                rows={4} 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                aria-required="true"
              ></textarea>
            </div>
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
            </button>
            {submitMessage.text && (
              <div 
                className={`submit-message ${submitMessage.type}`}
                role="alert"
              >
                {submitMessage.text}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Get Started Section */}
      <section className="get-started-section" ref={getStartedRef}>
        <h2>¿Listo para empezar?</h2>
        <p>Únete a miles de usuarios que ya organizan sus ideas con nosotros</p>
        <div className="action-buttons">
          <button 
            className="primary-button"
            onClick={() => navigate('/login')}
            aria-label="Iniciar sesión en la aplicación"
          >
            Iniciar Sesión
          </button>
          <button 
            className="secondary-button"
            onClick={() => navigate('/login')}
            aria-label="Registrarse en la aplicación"
          >
            Registrarse
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/index.ts';
import Header from './components/Layout/Header.tsx';
import Home from './pages/Home.tsx';
import Login from './pages/Login.tsx';
import Notes from './pages/Notes.tsx';
import PrivateRoute from './components/PrivateRoute.tsx';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="app">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/notes" element={
                <PrivateRoute>
                  <Notes />
                </PrivateRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
}

export default App;

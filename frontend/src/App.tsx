import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Notes from './pages/Notes';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/notes" element={<Notes />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;

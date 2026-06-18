import React from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Results from "./pages/Results.jsx";
import Layout from "./components/Layout.jsx";
import Itinerary from "./pages/Itinerary.jsx";

function LogOut(){
  localStorage.clear()
  return <Navigate to="/login" />
}

function RegisterAndLogout(){
  localStorage.clear()
  return <Register />
}

function App() {
  return (
      <BrowserRouter>
            <Routes>

                {/* Routes with sidebar */}
                <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/itinerary/:id" element={<Itinerary />} />
                </Route>

                {/* Routes without sidebar */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<RegisterAndLogout />} />
                <Route path="/logout" element={<LogOut />} />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
  )
}

export default App

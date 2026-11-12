import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveSlots from "./pages/LiveSlots";
import Controls from "./pages/Controls";
import AIPrediction from "./pages/AIPrediction";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import SystemStatus from "./pages/SystemStatus";

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/slots" element={<LiveSlots />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/prediction" element={<AIPrediction />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/system" element={<SystemStatus />} />
        </Routes>
      </main>
    </div>
  );
}
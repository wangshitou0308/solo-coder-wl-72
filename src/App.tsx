import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import Panels from '@/pages/Panels';
import Generation from '@/pages/Generation';
import Revenue from '@/pages/Revenue';
import Maintenance from '@/pages/Maintenance';
import Report from '@/pages/Report';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/panels" element={<Panels />} />
          <Route path="/generation" element={<Generation />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </Router>
  );
}

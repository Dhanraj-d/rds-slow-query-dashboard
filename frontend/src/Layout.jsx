import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Database, RefreshCw, Home, List, AlertTriangle, Menu, X } from 'lucide-react';
import { getDatabases } from './api';

const Layout = () => {
    const [databases, setDatabases] = useState([]);
    const [selectedDb, setSelectedDb] = useState('');
    const [timeRange, setTimeRange] = useState('24h');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const location = useLocation();

    // Fetch databases once on mount
    useEffect(() => {
        getDatabases().then(setDatabases).catch(console.error);
    }, []);

    const contextValue = {
        selectedDb,
        timeRange,
        autoRefresh
    };

    const NavItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent)' : 'transparent',
                transition: 'all 0.2s',
                textDecoration: 'none',
                marginBottom: '8px',
                fontWeight: isActive ? 500 : 400
            })}
        >
            <Icon size={20} />
            {sidebarOpen && <span>{label}</span>}
        </NavLink>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* Sidebar */}
            <div style={{
                width: sidebarOpen ? '260px' : '80px',
                background: 'var(--card-bg)',
                borderRight: '1px solid var(--border)',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '8px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                        padding: '8px',
                        borderRadius: '8px',
                        boxShadow: '0 0 15px var(--accent-glow)'
                    }}>
                        <Database size={24} color="white" />
                    </div>
                    {sidebarOpen && (
                        <div>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>RDS Leap</h2>
                        </div>
                    )}
                </div>

                <nav style={{ flex: 1 }}>
                    <NavItem to="/" icon={Home} label="Overview" />
                    <NavItem to="/queries" icon={List} label="Slow Queries" />
                    <NavItem to="/errors" icon={AlertTriangle} label="Error Logs" />
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            width: '100%',
                            display: 'flex',
                            justifyContent: sidebarOpen ? 'flex-end' : 'center',
                            cursor: 'pointer'
                        }}
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {/* Header */}
                <header style={{
                    padding: '20px 32px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.5)',
                    backdropFilter: 'blur(10px)',
                    flexShrink: 0
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                        {location.pathname === '/' ? 'Overview' :
                            location.pathname === '/queries' ? 'Slow Queries' :
                                location.pathname === '/errors' ? 'Error Logs' : 'Dashboard'}
                    </h2>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <select
                            value={selectedDb}
                            onChange={(e) => setSelectedDb(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--card-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">All Databases</option>
                            {databases.map(db => (
                                <option key={db} value={db}>{db}</option>
                            ))}
                        </select>

                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--card-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="24h">Last 24 Hours</option>
                            <option value="2d">Last 2 Days</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>

                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{
                                background: autoRefresh ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${autoRefresh ? 'var(--success)' : 'rgba(255,255,255,0.2)'}`,
                                color: autoRefresh ? 'var(--success)' : 'var(--text-secondary)',
                                padding: '8px',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                            title="Auto Refresh (30s)"
                        >
                            <RefreshCw size={18} className={autoRefresh ? "spin-icon" : ""} />
                        </button>
                    </div>
                </header>

                <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                    <Outlet context={contextValue} />
                </main>
            </div>
            <style>{`
                .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: white !important; }
                .nav-item.active:hover { background: var(--accent) !important; }
            `}</style>
        </div>
    );
};

export default Layout;

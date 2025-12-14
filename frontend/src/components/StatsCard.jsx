import React from 'react';
import { Activity, Clock, FileText } from 'lucide-react';

const icons = {
    total: FileText,
    avg: Clock,
    max: Activity
};

const StatsCard = ({ title, value, type = 'total', subtext }) => {
    const Icon = icons[type] || FileText;

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', transition: 'transform 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>{title}</span>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                    <Icon size={20} color="var(--accent)" />
                </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</div>
            {subtext && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{subtext}</div>}
        </div>
    );
};

export default StatsCard;

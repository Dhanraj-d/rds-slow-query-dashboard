import React from 'react';
import { AlertOctagon } from 'lucide-react';

const ErrorTable = ({ errors }) => {
    if (!errors || errors.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '12px' }}>
                <div style={{ opacity: 0.5, marginBottom: '1rem' }}>No database errors logged</div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: '#ef4444' }}>
                    <AlertOctagon size={20} />
                    Database Errors
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {errors.length} events
                    </span>
                </h3>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0, background: 'transparent' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Level</th>
                            <th>Time (IST)</th>
                            <th>User</th>
                            <th>Database</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {errors.map((err, idx) => {
                            let ts = err.timestamp;
                            if (ts && !ts.endsWith('Z') && !ts.includes('+')) ts += 'Z';
                            const dateStr = ts ? new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-';

                            return (
                                <tr key={err.id || idx} style={{ borderLeft: '3px solid #ef4444' }}>
                                    <td>
                                        <span className="badge" style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.4)'
                                        }}>{err.error_level}</span>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                        {dateStr}
                                    </td>
                                    <td style={{ color: 'var(--text-primary)' }}>{err.user_name}</td>
                                    <td style={{ color: 'var(--text-tertiary)' }}>{err.db_name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#fca5a5' }}>
                                        {err.message || err.message_text}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ErrorTable;

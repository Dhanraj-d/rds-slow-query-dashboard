import React, { useState } from 'react';
import { Copy, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('sql', sql);

const TRUNCATE_LIMIT = 300; // characters

const QueryTable = ({ queries, maxDuration, isTopView = false, sortBy, sortOrder, onSort, totalCount }) => {
    const [copiedId, setCopiedId] = useState(null);
    const [expandedIds, setExpandedIds] = useState([]);

    const copyToClipboard = async (text, id) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.warn('Clipboard API failed', err);
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getTypeColor = (type) => {
        if (!type) return '#94a3b8';
        const t = type.toUpperCase();
        if (t.includes('SELECT')) return '#10b981'; // Green
        if (t.includes('INSERT') || t.includes('UPDATE') || t.includes('DELETE')) return '#f59e0b'; // Amber
        return '#94a3b8'; // Slate
    };

    const renderSortHeader = (label, field, width) => {
        const canSort = !isTopView && onSort && field;
        return (
            <th
                style={{ width, cursor: canSort ? 'pointer' : 'default', userSelect: 'none' }}
                onClick={() => canSort && onSort(field)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {label}
                    {canSort && sortBy === field && (
                        sortOrder === 'asc' ? <ArrowUp size={14} strokeWidth={3} /> : <ArrowDown size={14} strokeWidth={3} />
                    )}
                </div>
            </th>
        );
    };

    if (!queries || queries.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '12px' }}>
                <div style={{ opacity: 0.5, marginBottom: '1rem' }}>No queries found for this period</div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                    {isTopView ? "Top Frequent Slow Queries" : "Recent Slow Queries"}
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginLeft: 'auto' }}>
                        {totalCount || queries.length} results
                    </span>
                </h3>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0, background: 'transparent' }}>
                <table>
                    <thead>
                        <tr>
                            {renderSortHeader("Type", "query_type", "80px")}
                            {isTopView && <th style={{ width: '80px' }}>Count</th>}
                            {renderSortHeader("DB User", "user_name", "150px")}
                            {renderSortHeader("Database", "db_name", "120px")}

                            {isTopView ? (
                                <th style={{ width: '120px' }}>Avg (s)</th>
                            ) : (
                                renderSortHeader("Duration (s)", "duration_ms", "120px")
                            )}

                            {isTopView ? (
                                <th style={{ width: '180px' }}>Last Seen (IST)</th>
                            ) : (
                                renderSortHeader("Time (IST)", "timestamp", "180px")
                            )}

                            <th>Query</th>
                        </tr>
                    </thead>
                    <tbody>
                        {queries.map((q, idx) => {
                            const uniqueId = q.query_hash || q.id || idx;
                            const qType = q.query_type || (q.query_text.toLowerCase().includes('select') ? 'SELECT' : 'OTHER');
                            const val = isTopView ? q.avg_duration : q.duration_ms;
                            const pct = maxDuration ? Math.min((val / maxDuration) * 100, 100) : 0;
                            let ts = isTopView ? q.last_seen : q.timestamp;
                            if (ts && !ts.endsWith('Z') && !ts.includes('+')) ts += 'Z';
                            const dateStr = ts ? new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-';
                            const typeColor = getTypeColor(qType);
                            // Reverted logic: standard truncate limit
                            const isLong = q.query_text && q.query_text.length > TRUNCATE_LIMIT;
                            const isExpanded = expandedIds.includes(uniqueId);
                            const displayText = isLong && !isExpanded ? q.query_text.slice(0, TRUNCATE_LIMIT) + '…' : q.query_text;

                            return (
                                <tr key={uniqueId}>
                                    <td>
                                        <span className="badge" style={{
                                            background: `${typeColor}20`,
                                            color: typeColor,
                                            border: `1px solid ${typeColor}40`
                                        }}>{qType}</span>
                                    </td>
                                    {isTopView && (
                                        <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{q.frequency}</td>
                                    )}
                                    <td style={{ color: 'var(--text-secondary)' }}>{q.user_name || '-'}</td>
                                    <td style={{ fontWeight: 500 }}>{q.db_name || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                flex: 1,
                                                height: '4px',
                                                background: 'rgba(255,255,255,0.1)',
                                                borderRadius: '2px',
                                                maxWidth: '60px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    background: val > 5000 ? 'var(--danger)' : 'var(--accent)',
                                                    borderRadius: '2px'
                                                }} />
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: val > 5000 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                {(val / 1000).toFixed(2)}s
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{dateStr}</td>
                                    <td>
                                        <div style={{ position: 'relative' }}>
                                            <div className="query-code-block" style={{
                                                maxWidth: '600px',
                                                overflow: 'hidden',
                                                borderRadius: '6px',
                                                background: '#282c34',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                position: 'relative' // For absolute copy button
                                            }}>
                                                <div style={{ paddingRight: '40px' }}> {/* Space for copy button */}
                                                    <SyntaxHighlighter
                                                        language="sql"
                                                        style={atomOneDark}
                                                        customStyle={{
                                                            margin: 0,
                                                            padding: '12px',
                                                            fontSize: '0.85rem',
                                                            lineHeight: '1.5',
                                                            background: 'transparent',
                                                            fontFamily: "'JetBrains Mono', monospace"
                                                        }}
                                                        wrapLongLines={true}
                                                    >
                                                        {displayText}
                                                    </SyntaxHighlighter>
                                                </div>

                                                {/* Absolute Copy Button */}
                                                <button
                                                    onClick={() => copyToClipboard(q.query_text, uniqueId)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        background: copiedId === uniqueId ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                                                        color: copiedId === uniqueId ? 'white' : 'var(--text-secondary)',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        backdropFilter: 'blur(4px)',
                                                        opacity: 0.8 /* subtler until hover (optional) */
                                                    }}
                                                    title="Copy SQL"
                                                >
                                                    {copiedId === uniqueId ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>

                                            {isLong && (
                                                <button
                                                    onClick={() => toggleExpand(uniqueId)}
                                                    style={{
                                                        marginTop: '6px',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        color: 'var(--text-secondary)',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    {isExpanded ? 'Collapse' : 'View Full'}
                                                </button>
                                            )}
                                        </div>
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

export default QueryTable;

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getErrors } from '../api';
import ErrorTable from '../components/ErrorTable';
import { Zap, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const Errors = () => {
    const { selectedDb, timeRange, autoRefresh } = useOutletContext();
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const calculateDateRange = (range) => {
        const now = new Date();
        const end = new Date(now);
        let start = new Date(now);
        switch (range) {
            case '24h': start.setHours(now.getHours() - 24); break;
            case '2d': start.setDate(now.getDate() - 2); break;
            case '7d': start.setDate(now.getDate() - 7); break;
            case '30d': start.setDate(now.getDate() - 30); break;
            default: start.setHours(now.getHours() - 24);
        }
        return { start: start.toISOString().split('.')[0], end: end.toISOString().split('.')[0] };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const { start, end } = calculateDateRange(timeRange);

            const data = await getErrors(page, 50, selectedDb, start, end);
            setErrors(data.items || []);
            setTotalPages(data.pages || 1);
            setTotalCount(data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDb, timeRange, page]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, selectedDb, timeRange, page]);

    const handleExport = () => {
        if (!errors || errors.length === 0) return;
        const headers = Object.keys(errors[0]).join(',');
        const rows = errors.map(row =>
            Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `db_errors_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {/* Controls Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button
                    onClick={handleExport}
                    style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Download size={18} /> Export Errors
                </button>
            </div>

            {loading && errors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Zap size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <div>Loading Errors...</div>
                </div>
            ) : (
                <>
                    <ErrorTable errors={errors} />

                    {/* Pagination Footer */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '1rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                    }}>
                        <div>
                            Showing {((page - 1) * 50) + 1} - {Math.min(page * 50, totalCount)} of {totalCount}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: page === 1 ? 'transparent' : 'var(--card-bg)',
                                    color: page === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <span style={{ padding: '6px 12px' }}>
                                Page {page} of {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: page >= totalPages ? 'transparent' : 'var(--card-bg)',
                                    color: page >= totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Errors;

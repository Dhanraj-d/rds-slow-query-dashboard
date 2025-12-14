import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getQueries, getTopQueries, getStats } from '../api';
import QueryTable from '../components/QueryTable';
import { Search, TrendingUp, List, Download, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

const SlowQueries = () => {
    const { selectedDb, timeRange, autoRefresh } = useOutletContext();

    const [queries, setQueries] = useState([]);
    const [maxDuration, setMaxDuration] = useState(1);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState('recent'); // 'recent' or 'top'
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState('desc');

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

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

            // Fetch Stats to get max_duration for table viz
            const statsData = await getStats(selectedDb, start, end);
            setMaxDuration(statsData?.max_duration || 1);

            let data;
            if (viewMode === 'top') {
                data = await getTopQueries(selectedDb, start, end);
                setQueries(data || []);
                setTotalPages(1);
                setTotalCount(data.length || 0);
            } else {
                data = await getQueries(page, 50, debouncedSearch, sortBy, sortOrder, null, null, selectedDb, start, end);
                setQueries(data.items || []);
                setTotalPages(data.pages || 1);
                setTotalCount(data.total || 0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDb, timeRange, viewMode, debouncedSearch, page, sortBy, sortOrder]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, selectedDb, timeRange, viewMode, debouncedSearch, page, sortBy, sortOrder]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const handleExport = () => {
        if (!queries || queries.length === 0) return;
        const headers = Object.keys(queries[0]).join(',');
        const rows = queries.map(row =>
            Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `slow_queries_${viewMode}_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {/* Controls Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {viewMode === 'recent' && (
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search queries..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    padding: '8px 12px 8px 36px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    minWidth: '240px'
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => { setViewMode(prev => prev === 'recent' ? 'top' : 'recent'); setPage(1); }}
                        style={{
                            background: viewMode === 'top' ? 'var(--accent)' : 'var(--card-bg)',
                            border: `1px solid ${viewMode === 'top' ? 'var(--accent)' : 'var(--border)'}`,
                            color: viewMode === 'top' ? 'white' : 'var(--text-secondary)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {viewMode === 'recent' ? <TrendingUp size={18} /> : <List size={18} />}
                        {viewMode === 'recent' ? 'Show Top Queries' : 'Show Recent'}
                    </button>

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
                        <Download size={18} /> Export
                    </button>
                </div>
            </div>

            {loading && queries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Zap size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <div>Loading Queries...</div>
                </div>
            ) : (
                <>
                    <QueryTable
                        queries={queries}
                        maxDuration={maxDuration}
                        isTopView={viewMode === 'top'}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        totalCount={totalCount}
                    />

                    {/* Pagination Footer */}
                    {viewMode === 'recent' && (
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
                    )}
                </>
            )}
        </div>
    );
};

export default SlowQueries;

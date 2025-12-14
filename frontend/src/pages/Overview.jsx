import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getStats, getHistogram, getTopQueries } from '../api';
import StatsCard from '../components/StatsCard';
import MetricChart from '../components/MetricChart';
import { Zap } from 'lucide-react';

const Overview = () => {
    const { selectedDb, timeRange, autoRefresh } = useOutletContext();
    const [stats, setStats] = useState(null);
    const [histogram, setHistogram] = useState([]);
    const [topStats, setTopStats] = useState([]); // For "Top Queries Shown" metric
    const [loading, setLoading] = useState(true);

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
            const [statsData, histData, topData] = await Promise.all([
                getStats(selectedDb, start, end),
                getHistogram(selectedDb, start, end),
                getTopQueries(selectedDb, start, end) // Just to get count for card
            ]);
            setStats(statsData);
            setHistogram(histData);
            setTopStats(topData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDb, timeRange]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, selectedDb, timeRange]);

    if (loading && !stats) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                <Zap size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <div>Loading Intelligence...</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatsCard
                    title="Total Slow Queries"
                    value={stats?.total_queries || 0}
                    type="total"
                    subtext="Captured in local DB"
                />
                <StatsCard
                    title="Unique Query Patterns"
                    value={topStats?.length || 0}
                    type="total"
                    subtext="Aggregated normalized queries"
                />
                <StatsCard
                    title="Avg Duration"
                    value={`${stats?.avg_duration || 0} ms`}
                    type="avg"
                    subtext="Average latency of captured queries"
                />
                <StatsCard
                    title="Max Duration"
                    value={`${stats?.max_duration || 0} ms`}
                    type="max"
                    subtext="Slowest query recorded"
                />
            </div>

            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Traffic Overview</h3>
            <MetricChart data={histogram} timeRange={timeRange} />
        </div>
    );
};

export default Overview;

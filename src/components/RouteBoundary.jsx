import { Component } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';

class PageBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error) { console.error('Page failed:', error); }
    render() {
        if (!this.state.failed) return this.props.children;
        return <div className="page-state" role="alert">
            <AlertCircle size={32} />
            <h1>Не удалось открыть страницу</h1>
            <p>Попробуйте загрузить её ещё раз.</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}><RefreshCw size={16} /> Обновить</button>
            <Link to="/dashboard">На главную</Link>
        </div>;
    }
}

export default function RouteBoundary({ children }) {
    const { pathname } = useLocation();
    return <PageBoundary key={pathname}>{children}</PageBoundary>;
}
